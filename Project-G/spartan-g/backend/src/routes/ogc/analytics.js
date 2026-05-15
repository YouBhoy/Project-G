import express from 'express';
import { readDb } from '../../db.mysql.js';

const router = express.Router();

function mean(a){ if(!a||a.length===0) return null; return a.reduce((s,x)=>s+x,0)/a.length; }

function safeNum(v){ return v===undefined||v===null?0:Number(v); }

// Build per-student feature vector from available assessments and esm
async function buildFeatures(snapshot){
  const students = snapshot.students || [];
  const assessments = snapshot.assessments || [];
  const dass = snapshot.dass21Responses || [];
  const esm = snapshot.esmEntries || [];

  // group assessments and responses
  const assessmentsById = {};
  for(const a of assessments) assessmentsById[a.assessmentId]=a;

  const dassByAssess = {};
  for(const r of dass){
    dassByAssess[r.assessmentId] = dassByAssess[r.assessmentId] || [];
    dassByAssess[r.assessmentId].push(r);
  }

  const esmByStudent = {};
  for(const e of esm){ esmByStudent[e.studentId]=esmByStudent[e.studentId]||[]; esmByStudent[e.studentId].push(e); }

  const lastAssessByType = (sid, type) => {
    const arr = assessments.filter(a=>a.studentId===sid && (a.type||'').toUpperCase()===type.toUpperCase());
    if(!arr.length) return null;
    arr.sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
    return arr[0];
  };

  return students.map(s=>{
    const sid = s.studentId;
    // DASS aggregate
    const lastDass = lastAssessByType(sid,'DASS21') || lastAssessByType(sid,'DASS-21');
    let depression=0, anxiety=0, stress=0;
    if(lastDass){
      const resp = dassByAssess[lastDass.assessmentId]||[];
      const bySub = {};
      for(const r of resp){ bySub[r.subscale]= (bySub[r.subscale]||0) + safeNum(r.score); }
      depression = safeNum(bySub['Depression']);
      anxiety = safeNum(bySub['Anxiety']);
      stress = safeNum(bySub['Stress']);
    }

    // PHQ9/GAD7 last
    const lastPhq = lastAssessByType(sid,'PHQ9');
    let phq = null;
    if(lastPhq){
      const resp = dassByAssess[lastPhq.assessmentId]||[];
      phq = resp.reduce((a,r)=>a+safeNum(r.score),0);
    }
    const lastGad = lastAssessByType(sid,'GAD7');
    let gad = null;
    if(lastGad){
      const resp = dassByAssess[lastGad.assessmentId]||[];
      gad = resp.reduce((a,r)=>a+safeNum(r.score),0);
    }

    // ESM aggregates (14d)
    const entries = esmByStudent[sid]||[];
    const now = new Date();
    const cutoff = new Date(now.getTime() - 14*24*60*60*1000);
    const recent = entries.filter(e=> new Date(e.promptTime) >= cutoff );
    const avgMood = recent.length? mean(recent.map(x=>safeNum(x.moodScore))) : (entries.length? mean(entries.map(x=>safeNum(x.moodScore))) : null);
    const avgEnergy = recent.length? mean(recent.map(x=>safeNum(x.energyScore))) : (entries.length? mean(entries.map(x=>safeNum(x.energyScore))) : null);
    const anomalyCount = entries.length<3?0: entries.filter(x=> Math.abs(safeNum(x.moodScore)- (mean(entries.map(y=>safeNum(y.moodScore))))) > 2* (Math.sqrt(entries.map(y=>Math.pow(safeNum(y.moodScore)-mean(entries.map(z=>safeNum(z.moodScore))),2)).reduce((a,b)=>a+b,0)/entries.length) || 0) ).length;

    return {
      studentId: sid,
      college: s.college,
      yearLevel: s.yearLevel,
      sex: s.sex,
      depression,
      anxiety,
      stress,
      phq: phq===null?0:phq,
      gad: gad===null?0:gad,
      avgMood: avgMood===null?0:avgMood,
      avgEnergy: avgEnergy===null?0:avgEnergy,
      esmAnomalies: anomalyCount
    };
  });
}

// Simple logistic regression trainer (gradient descent)
function trainLogistic(X, y, opts={lr:0.1, epochs:500, l2:0.001}){
  const n = X.length; if(n===0) return null;
  const m = X[0].length;
  let w = new Array(m).fill(0); let b=0;
  for(let e=0;e<opts.epochs;e++){
    const grad = new Array(m).fill(0); let gb=0;
    for(let i=0;i<n;i++){
      const xi=X[i]; const yi=y[i];
      let z = b; for(let j=0;j<m;j++) z += w[j]*xi[j];
      const p = 1/(1+Math.exp(-z));
      const err = p-yi;
      for(let j=0;j<m;j++) grad[j] += err*xi[j];
      gb += err;
    }
    // update
    for(let j=0;j<m;j++){
      w[j] -= opts.lr*(grad[j]/n + opts.l2*w[j]);
    }
    b -= opts.lr*(gb/n);
  }
  return {w,b};
}

function predictLogistic(model, x){ if(!model) return 0.0; let z = model.b; for(let j=0;j<model.w.length;j++) z += model.w[j]*x[j]; return 1/(1+Math.exp(-z)); }

// Very small gradient-boosted stump ensemble (one-level trees)
function trainGBoost(X,y, opts={rounds:10, lr:0.1}){
  const n = X.length; if(n===0) return null;
  const m = X[0].length;
  let preds = new Array(n).fill(0);
  const trees = [];
  for(let r=0;r<opts.rounds;r++){
    const residuals = y.map((yi,i)=> yi - preds[i]);
    let best = null;
    for(let j=0;j<m;j++){
      const vals = Array.from(new Set(X.map(x=>x[j]))).sort((a,b)=>a-b);
      for(const t of vals){
        let leftSum=0,leftCnt=0,rightSum=0,rightCnt=0;
        for(let i=0;i<n;i++){
          if(X[i][j] <= t){ leftSum += residuals[i]; leftCnt++; } else { rightSum += residuals[i]; rightCnt++; }
        }
        const leftPred = leftCnt? leftSum/leftCnt : 0;
        const rightPred = rightCnt? rightSum/rightCnt : 0;
        // compute mse
        let mse=0;
        for(let i=0;i<n;i++){
          const pred = X[i][j] <= t ? leftPred : rightPred;
          mse += Math.pow(residuals[i]-pred,2);
        }
        if(!best || mse < best.mse) best = {j,t,leftPred,rightPred,mse};
      }
    }
    if(!best) break;
    trees.push(best);
    // update preds
    for(let i=0;i<n;i++){
      preds[i] += opts.lr * ( X[i][best.j] <= best.t ? best.leftPred : best.rightPred );
    }
  }
  return {trees,lr:opts.lr};
}

function predictGBoost(model,x){ if(!model) return 0.0; let s=0; for(const t of model.trees){ s += model.lr * ( x[t.j] <= t.t ? t.leftPred : t.rightPred ); } return 1/(1+Math.exp(-s)); }

// Endpoint: compute predictions and explanations
router.get('/predict', async (req,res)=>{
  try{
    const snapshot = await readDb();
    const features = await buildFeatures(snapshot);

    // Build feature matrix
    const featureNames = ['depression','anxiety','stress','phq','gad','avgMood','avgEnergy','esmAnomalies'];
    const X = features.map(f => featureNames.map(n=> safeNum(f[n]) ));

    // Build labels from latest classification: positive if High/Crisis
    const latestClassByStudent = {};
    for(const c of snapshot.riskClassifications||[]){
      const sid = c.studentId;
      if(!latestClassByStudent[sid] || new Date(c.generatedAt) > new Date(latestClassByStudent[sid].generatedAt)) latestClassByStudent[sid]=c;
    }
    const y = features.map(f => {
      const cls = latestClassByStudent[f.studentId];
      if(!cls) return 0; const lv = cls.riskLevel||'Low'; return (lv==='High'||lv==='Crisis')?1:0;
    });

    // Simple normalization (z-score)
    const means = [], sds = [];
    for(let j=0;j<featureNames.length;j++){
      const col = X.map(r=>r[j]);
      const m = mean(col); const sd = Math.sqrt(col.map(v=>Math.pow(v-m,2)).reduce((a,b)=>a+b,0)/col.length)||1;
      means.push(m); sds.push(sd);
      for(let i=0;i<X.length;i++) X[i][j] = (X[i][j]-m)/sd;
    }

    const logModel = trainLogistic(X,y,{lr:0.05,epochs:400,l2:0.01});
    const xgbModel = trainGBoost(X,y,{rounds:15,lr:0.1});

    // Predictions and explanations
    const rows = features.map((f,idx)=>{
      const xv = X[idx];
      const pLog = predictLogistic(logModel,xv);
      const pXgb = predictGBoost(xgbModel,xv);
      // SHAP-like: for logistic use coef*feature
      const shapLog = (logModel && logModel.w)? featureNames.map((n,j)=>({feature:n,contribution: logModel.w[j]*xv[j]})) : [];
      const shapXgb = [];
      if(xgbModel){
        // contribution per feature approximated by sum of stump outputs where stump uses that feature
        const contrib = {};
        for(const t of xgbModel.trees){
          const feat = featureNames[t.j]; const val = (xv[t.j] <= t.t ? t.leftPred : t.rightPred) * xgbModel.lr;
          contrib[feat] = (contrib[feat]||0) + val;
        }
        for(const k of Object.keys(contrib)) shapXgb.push({feature:k,contribution:contrib[k]});
      }

      return {
        studentId: f.studentId,
        probs: { logistic: Math.round(pLog*10000)/10000, xgboost: Math.round(pXgb*10000)/10000 },
        explanations: { logistic: shapLog, xgboost: shapXgb }
      };
    });

    return res.json({ success:true, data: { featureNames, rows } });
  }catch(err){ console.error('Analytics predict error',err); return res.status(500).json({success:false,message:'Failed to compute predictions'}); }
});

// Endpoint: prescriptive recommendations (rules + decision tree style)
router.get('/prescribe', async (req,res)=>{
  try{
    const snapshot = await readDb();
    const features = await buildFeatures(snapshot);

    const recommendations = features.map(f=>{
      // Simple rule-based engine
      const rules = [];
      if(f.phq >= 20 || f.depression*2 >= 28) rules.push('Immediate referral to OGC - possible crisis');
      if(f.avgMood <= 3 || f.esmAnomalies > 0) rules.push('Schedule check-in / outreach');
      if(f.gad >= 10 || f.anxiety*2 >= 10) rules.push('Recommend cognitive coping workshop');
      if(rules.length===0) rules.push('Monitor and provide psychoeducation resources');

      // Decision-tree style pathway
      let pathway = 'Monitor';
      if(rules.includes('Immediate referral to OGC - possible crisis')) pathway = 'Refer';
      else if(rules.includes('Schedule check-in / outreach') || rules.includes('Recommend cognitive coping workshop')) pathway = 'Intervene';

      return { studentId: f.studentId, rules, pathway };
    });

    return res.json({ success:true, data: recommendations });
  }catch(err){ console.error('Prescribe error',err); return res.status(500).json({success:false,message:'Failed to compute prescriptions'}); }
});

export default router;
