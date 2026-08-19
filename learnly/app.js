
const state = {
  grade: localStorage.getItem("learnly_grade") || "8",
  route: "home",
  curriculum: null,
  questions: [],
  current: 0,
  score: 0,
  answered: false,
  profile: JSON.parse(localStorage.getItem("learnly_profile") || '{"name":"Student","code":"EL-DEMO"}'),
  stats: JSON.parse(localStorage.getItem("learnly_stats") || '{"answered":0,"correct":0,"xp":0}')
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function save(){localStorage.setItem("learnly_grade",state.grade);localStorage.setItem("learnly_profile",JSON.stringify(state.profile));localStorage.setItem("learnly_stats",JSON.stringify(state.stats))}
async function loadData(){
  const r=await fetch("content/curriculum_all_grades.json"); state.curriculum=await r.json();
}
function gradeLabel(g){return state.curriculum?.grades?.[String(g)]?.label || `Grade ${g}`}
function topicsFor(g){return state.curriculum?.grades?.[String(g)]?.topics || []}

function render(){
  const main=$("#main");
  if(state.route==="home") main.innerHTML=home();
  else if(state.route==="learn") main.innerHTML=learn();
  else if(state.route==="practice") main.innerHTML=practice();
  else if(state.route==="papers") main.innerHTML=papers();
  else if(state.route==="progress") main.innerHTML=progress();
  else main.innerHTML=settings();
  document.querySelectorAll("[data-route]").forEach(b=>b.classList.toggle("active",b.dataset.route===state.route));
  wire();
}
function home(){
  const s=state.stats;
  return `<div class="hero"><div class="muted">Welcome back</div><h1>${esc(state.profile.name)}</h1>
  <p>${gradeLabel(state.grade)} • ${esc(state.profile.code)}</p>
  <div class="row"><span class="badge">⚡ ${s.xp} XP</span><span class="badge">✓ ${s.correct} correct</span></div></div>
  <div class="section"><h2>Continue learning</h2><div class="actions">
    <button class="action" data-route="learn"><strong>📚 Learn</strong><span class="muted">Explore your curriculum</span></button>
    <button class="action" data-route="practice"><strong>⚡ Practice</strong><span class="muted">Test your skills</span></button>
    <button class="action" data-route="papers"><strong>📄 Papers</strong><span class="muted">Build a practice paper</span></button>
    <button class="action" data-route="progress"><strong>📈 Progress</strong><span class="muted">See your mastery</span></button>
  </div></div>
  <div class="section card"><h3>Your progress</h3><div class="progress"><i style="width:${Math.min(100,s.correct*5)}%"></i></div><p class="muted">${s.answered} questions answered • ${s.correct} correct</p></div>`;
}
function learn(){
  const ts=topicsFor(state.grade);
  return `<div class="row"><div style="flex:1"><h1>Learn</h1><p class="muted">${gradeLabel(state.grade)} mathematics curriculum</p></div>
  <select id="gradeSelect" style="max-width:150px">${Object.keys(state.curriculum.grades).map(g=>`<option value="${g}" ${g===String(state.grade)?"selected":""}>${esc(state.curriculum.grades[g].label)}</option>`).join("")}</select></div>
  <div class="grid">${ts.map(t=>`<div class="card topic"><span class="emoji">${t.icon||"📘"}</span><div><h3>${esc(t.name)}</h3><span class="muted">Term ${t.term??"—"}</span></div><button class="secondary" data-topic="${esc(t.id)}">Open</button></div>`).join("")}</div>`;
}
function practice(){
  return `<h1>Practice</h1><p class="muted">Offline practice using Learnly's local content.</p>
  <div class="card"><label>Grade</label><select id="practiceGrade">${Object.keys(state.curriculum.grades).map(g=>`<option value="${g}" ${g===String(state.grade)?"selected":""}>${esc(state.curriculum.grades[g].label)}</option>`).join("")}</select>
  <label>Topic</label><select id="practiceTopic">${topicsFor(state.grade).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select>
  <div class="row" style="margin-top:14px"><button class="primary" id="startPractice">Start practice</button><span class="muted">Questions are selected from the local question/content bank.</span></div></div>
  <div id="practiceArea" class="section"></div>`;
}
async function startPractice(){
  const topic=$("#practiceTopic")?.value;
  const path=`content/grade8/topics/${topic}.json`;
  let data=null;
  try{data=await (await fetch(path)).json()}catch(e){}
  const qs=extractQuestions(data).slice(0,10);
  if(!qs.length){$("#practiceArea").innerHTML=`<div class="card"><h3>Content loaded, but no directly interactive questions were found for this topic.</h3><p class="muted">Use Learnly's paper/lesson content or add structured question items to the topic JSON.</p></div>`;return}
  state.questions=qs;state.current=0;state.score=0;state.answered=false;showQuestion();
}
function extractQuestions(data){
  const out=[];
  function walk(x){
    if(Array.isArray(x)){x.forEach(walk);return}
    if(!x||typeof x!=="object")return;
    if(typeof x.question==="string"){
      const opts=x.options||x.choices||x.answers;
      if(Array.isArray(opts) && opts.length>=2) out.push({q:x.question,options:opts,answer:x.answer??x.correct_answer??x.correct});
    }
    Object.values(x).forEach(v=>{if(v&&typeof v==="object")walk(v)});
  }
  walk(data); return out;
}
function showQuestion(){
  const q=state.questions[state.current];
  $("#practiceArea").innerHTML=`<div class="card"><div class="muted">Question ${state.current+1} of ${state.questions.length}</div><div class="question">${esc(q.q)}</div>
  ${q.options.map((o,i)=>`<button class="option" data-opt="${i}">${esc(typeof o==="object"?o.text:o)}</button>`).join("")}
  <div id="feedback" class="section"></div></div>`;
  document.querySelectorAll("[data-opt]").forEach(b=>b.onclick=()=>answer(Number(b.dataset.opt)));
}
function answer(i){
  if(state.answered)return; state.answered=true;
  const q=state.questions[state.current];
  const correct=typeof q.answer==="number"?q.answer:String(q.answer??"").toLowerCase();
  const chosen=String(q.options[i]).toLowerCase();
  const ok=correct===i || correct===chosen || chosen.includes(correct) || correct.includes(chosen);
  document.querySelectorAll("[data-opt]").forEach((b,j)=>{if(j===i)b.classList.add(ok?"correct":"wrong")});
  if(ok){state.score++;state.stats.correct++;state.stats.xp+=10}
  state.stats.answered++;save();
  $("#feedback").innerHTML=`<p>${ok?"✅ Correct!":"❌ Not quite."}</p><button class="primary" id="nextQ">${state.current+1<state.questions.length?"Next":"Finish"}</button>`;
  $("#nextQ").onclick=()=>{state.current++;state.answered=false;if(state.current<state.questions.length)showQuestion();else finishPractice()};
}
function finishPractice(){
  $("#practiceArea").innerHTML=`<div class="card"><h2>Practice complete</h2><p>You scored <strong>${state.score}/${state.questions.length}</strong>.</p><button class="primary" data-route="progress">View progress</button></div>`;
}
function papers(){
  const ts=topicsFor(state.grade);
  return `<h1>Question Papers</h1><p class="muted">Build a paper locally from the curriculum.</p><div class="card">
  <label>Grade</label><select id="paperGrade">${Object.keys(state.curriculum.grades).map(g=>`<option value="${g}" ${g===String(state.grade)?"selected":""}>${esc(state.curriculum.grades[g].label)}</option>`).join("")}</select>
  <label>Topic</label><select id="paperTopic">${ts.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select>
  <label>Questions</label><select id="paperCount"><option>10</option><option>20</option><option>30</option></select>
  <button class="primary" id="generatePaper" style="margin-top:14px">Generate paper</button></div><div id="paperArea" class="section"></div>`;
}
function progress(){
  const pct=state.stats.answered?Math.round(state.stats.correct/state.stats.answered*100):0;
  return `<h1>Progress</h1><div class="grid">
  <div class="card"><h3>Accuracy</h3><div style="font-size:34px;font-weight:900">${pct}%</div><div class="progress"><i style="width:${pct}%"></i></div></div>
  <div class="card"><h3>Questions</h3><div style="font-size:34px;font-weight:900">${state.stats.answered}</div><span class="muted">answered</span></div>
  <div class="card"><h3>XP</h3><div style="font-size:34px;font-weight:900">${state.stats.xp}</div><span class="muted">earned locally</span></div></div>
  <div class="section card"><h3>Mastery engine</h3><p class="muted">Learnly's offline architecture supports deterministic mastery, adaptive practice and paper generation from structured local content.</p></div>`;
}
function settings(){
  return `<h1>Settings</h1><div class="card"><label>Student name</label><input id="name" value="${esc(state.profile.name)}">
  <label>Student code</label><input id="code" value="${esc(state.profile.code)}">
  <button class="primary" id="saveProfile" style="margin-top:14px">Save profile</button>
  <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
  <button class="secondary" id="resetData">Reset local progress</button>
  <p class="muted">This PWA stores the profile and progress on the device using localStorage.</p></div>`;
}
async function generatePaper(){
  const topic=$("#paperTopic").value, count=Number($("#paperCount").value);
  let data=null;try{data=await (await fetch(`content/grade8/topics/${topic}.json`)).json()}catch(e){}
  const qs=extractQuestions(data).slice(0,count);
  const title=topicsFor(state.grade).find(t=>t.id===topic)?.name||"Learnly Practice Paper";
  const html=`<div class="card" id="printPaper"><h2>LEARNLY</h2><h1>${esc(title)}</h1><p>${esc(gradeLabel(state.grade))} • Name: __________________ • Date: __________</p><hr>
  ${qs.length?qs.map((q,i)=>`<div style="margin:20px 0"><strong>${i+1}.</strong> ${esc(q.q)}<div class="muted" style="margin-top:8px">${q.options.map((o,j)=>`${String.fromCharCode(65+j)}. ${esc(o)}`).join(" &nbsp; ")}</div></div>`).join(""):`<p>This topic does not expose structured multiple-choice questions yet. The local source content is still available in Learn mode.</p>`}
  <hr><p class="muted">Generated locally by Learnly.</p></div><div class="row" style="margin-top:12px"><button class="primary" id="printBtn">Print / Save PDF</button></div>`;
  $("#paperArea").innerHTML=html; $("#printBtn").onclick=()=>window.print();
}
function wire(){
  document.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>{state.route=b.dataset.route;$("#drawer").classList.remove("open");render()});
  const gs=$("#gradeSelect"); if(gs) gs.onchange=()=>{state.grade=gs.value;save();render()};
  const pg=$("#practiceGrade"); if(pg) pg.onchange=()=>{state.grade=pg.value;save();render()};
  const gg=$("#paperGrade"); if(gg) gg.onchange=()=>{state.grade=gg.value;save();render()};
  const sp=$("#startPractice"); if(sp) sp.onclick=startPractice;
  const gp=$("#generatePaper"); if(gp) gp.onclick=generatePaper;
  const sv=$("#saveProfile"); if(sv) sv.onclick=()=>{state.profile={name:$("#name").value.trim()||"Student",code:$("#code").value.trim()||"EL-DEMO"};save();toast("Profile saved");render()};
  const rd=$("#resetData"); if(rd) rd.onclick=()=>{state.stats={answered:0,correct:0,xp:0};save();toast("Progress reset");render()};
}
$("#menuBtn").onclick=()=>$("#drawer").classList.add("open");
$("#closeDrawer").onclick=()=>$("#drawer").classList.remove("open");

let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
loadData().then(render).catch(e=>{$("#main").innerHTML=`<div class="card"><h2>Learnly could not load its local content.</h2><p>${esc(e.message)}</p><p class="muted">Run the PWA from a local web server; browsers block fetch() from file:// for local JSON.</p></div>`});
