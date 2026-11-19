const entrance=document.querySelector('#entrance'),destination=document.querySelector('#destination'),website=document.querySelector('#website'),login=document.querySelector('#login');
let busy=false,current='home';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.side').forEach(side=>{
 let pointerFrame=0,pointerX=0,pointerY=0;
 side.addEventListener('pointermove',e=>{
  if(busy||reduced||e.pointerType==='touch')return;
  pointerX=e.clientX;pointerY=e.clientY;
  if(pointerFrame)return;
  pointerFrame=requestAnimationFrame(()=>{
   pointerFrame=0;
   if(busy||reduced)return;
   const r=side.getBoundingClientRect();
   const x=(pointerX-r.left)/r.width-.5,y=(pointerY-r.top)/r.height-.5;
   side.style.setProperty('--mx',x*35+'px');side.style.setProperty('--my',y*35+'px');
   side.style.setProperty('--cx',x*10+'px');side.style.setProperty('--cy',y*10+'px');
  });
 });
 side.addEventListener('pointerleave',()=>{
  cancelAnimationFrame(pointerFrame);pointerFrame=0;
  ['--mx','--my','--cx','--cy'].forEach(v=>side.style.setProperty(v,'0px'));
 });
 side.addEventListener('click',()=>enter(side));
});
function content(target){current=target;website.hidden=target!=='home';login.hidden=target!=='login';if(target==='home'&&website.getAttribute('src')==='about:blank')website.src='./home.html';document.querySelector('#switch').textContent=target==='home'?'LOGIN':'官网 / OUFU'}
async function enter(side){
 if(busy)return;busy=true;content(side.dataset.target);destination.hidden=false;destination.inert=true;
 side.classList.add('selected');entrance.classList.add('departing');
 const options={duration:reduced?0:800,fill:'forwards',easing:'cubic-bezier(.55,0,1,.45)'};
 const letters=[...side.querySelectorAll('.word b')];
 const animations=letters.map((b,i)=>b.animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY('+innerHeight+'px) rotate('+(i%2?35:-30)+'deg)'}],{...options,delay:reduced?0:250+i*35}));
 side.querySelectorAll('.description,.number,.enter,.shapes,.orb').forEach(el=>animations.push(el.animate([{opacity:1},{opacity:0}],{duration:reduced?0:300,delay:reduced?0:250,fill:'forwards'})));
 await Promise.all(animations.map(a=>a.finished));
 await entrance.animate([{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 100% 0)'}],{duration:reduced?0:900,easing:'cubic-bezier(.77,0,.18,1)',fill:'forwards'}).finished;
 entrance.hidden=true;destination.inert=false;busy=false;(current==='login'?document.querySelector('#username'):document.querySelector('#back')).focus();
}
document.querySelector('#back').onclick=()=>{entrance.getAnimations({subtree:true}).forEach(a=>a.cancel());entrance.classList.remove('departing');document.querySelectorAll('.side').forEach(s=>s.classList.remove('selected'));entrance.hidden=false;destination.hidden=true;document.querySelector('.side').focus()};
document.querySelector('#switch').onclick=()=>{content(current==='home'?'login':'home');if(current==='login')document.querySelector('#username').focus()};
document.querySelector('#reveal').onclick=()=>{const input=document.querySelector('#password'),show=input.type==='password';input.type=show?'text':'password';document.querySelector('#reveal').textContent=show?'隐藏':'显示';document.querySelector('#reveal').setAttribute('aria-label',show?'隐藏密码':'显示密码')};
document.querySelector('form').onsubmit=e=>{e.preventDefault();document.querySelector('#message').textContent='登录服务尚未接入。输入内容未发送或保存。'};


