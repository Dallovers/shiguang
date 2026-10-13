/* Three spatial compositions, one continuous camera and spring-driven interaction. */
class SpatialAlbum {
  constructor(stage, world, callbacks) {
    this.stage=stage; this.world=world; this.callbacks=callbacks;
    this.cards=[]; this.poses=[]; this.mode='ring'; this.width=1; this.height=1;
    this.phase=0; this.pitch=.23; this.pitchTarget=.23; this.spinVelocity=0;
    this.zoom=1; this.zoomTarget=1; this.travel=0; this.travelTarget=0;
    this.position=0; this.target=0; this.expanded=true; this.spread=1;
    this.look={x:0,y:0}; this.pointer={x:0,y:0}; this.drag=null; this.suppressClick=false;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)'); this.auto=!this.reduced.matches;
    this.hover=false; this.focused=false; this.last=0; this.raf=0; this.dirty=true;
    this.reduced.addEventListener('change',()=>{this.auto=!this.reduced.matches;this.updateControls();this.wake()});
    new ResizeObserver(()=>{this.width=stage.clientWidth;this.height=stage.clientHeight;this.dirty=true;this.wake()}).observe(stage);
    this.bind(); this.wake();
  }
  setItems(cards,items) {
    this.cards=cards; this.items=items; this.poses=cards.map(()=>({x:0,y:0,z:-1200,rx:0,ry:0,rz:0,w:40,h:50,a:0}));
    this.position=this.target=0;this.travel=this.travelTarget=0;this.reportedIndex=-1;this.dirty=true;
    cards.forEach((card,i)=>{
      card.onclick=()=>{if(this.suppressClick)return;const selected=((Math.round(this.position)%this.cards.length)+this.cards.length)%this.cards.length;if(this.mode==='stack'&&i!==selected){this.setIndex(i)}else this.callbacks.select(i)};
      card.addEventListener('mouseenter',()=>{this.hover=true;this.wake()});
      card.addEventListener('mouseleave',()=>{this.hover=false;this.wake()});
    });
    this.wake();
  }
  setMode(mode) {
    if(this.mode!==mode){this.drag=null;this.stage.classList.remove('dragging');this.hover=false;this.focused=false;this.spinVelocity=0}
    this.mode=mode;this.dirty=true;this.updateControls();this.wake();
  }
  updateControls(){
    const auto=document.querySelector('#auto-motion');auto.hidden=this.mode!=='ring';auto.setAttribute('aria-pressed',String(this.auto));auto.textContent=this.auto?'Ⅱ 暂停自转':'▷ 开始自转';
    const spread=document.querySelector('#spread');spread.hidden=this.mode!=='stack';spread.textContent=this.expanded?'收拢照片':'展开照片';spread.setAttribute('aria-pressed',String(this.expanded));
    document.querySelector('#scrubber-wrap').hidden=this.mode!=='stack'||!this.cards.length;
    document.querySelector('#flight-marker').hidden=this.mode!=='gallery'||!this.cards.length;
    document.querySelector('#scrubber').max=Math.max(0,this.cards.length-1);
  }
  toggleAuto(){this.auto=!this.auto;this.updateControls();this.wake()}
  toggleSpread(){this.expanded=!this.expanded;this.updateControls();this.dirty=true;this.wake()}
  step(d){if(!this.cards.length)return;if(this.mode==='ring'){this.phase+=d*.18;this.spinVelocity=d*.0008}else if(this.mode==='stack'){this.target=Math.round(this.target)+d}else this.travelTarget+=d*1.5;this.dirty=true;this.wake()}
  setIndex(i){const n=this.cards.length;if(!n)return;const current=((this.position%n)+n)%n;let diff=i-current;if(diff>n/2)diff-=n;if(diff<-n/2)diff+=n;this.target=this.position+diff;this.wake()}
  zoomBy(d){this.zoomTarget=Math.max(.7,Math.min(3.8,this.zoomTarget+d));this.wake()}
  reset(){this.phase=0;this.pitchTarget=.23;this.zoomTarget=1;this.target=0;this.travelTarget=0;this.spinVelocity=0;this.pointer={x:0,y:0};this.dirty=true;this.wake()}
  bind(){
    const s=this.stage;
    s.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('#scrubber-wrap'))return;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,t:performance.now(),velocity:0,phase:this.phase,pitch:this.pitchTarget,position:this.position,travel:this.travelTarget,moved:false};this.spinVelocity=0;
      this.suppressClick=false;this.wake();
    });
    s.addEventListener('pointermove',e=>{
      const rect=s.getBoundingClientRect();this.pointer={x:(e.clientX-rect.left)/this.width-.5,y:(e.clientY-rect.top)/this.height-.5};
      const d=this.drag;if(d&&d.id===e.pointerId){
        const dx=e.clientX-d.x,dy=e.clientY-d.y,now=performance.now();
        if(Math.hypot(dx,dy)>6){d.moved=true;this.suppressClick=true;s.classList.add('dragging');s.setPointerCapture(e.pointerId)}
        if(d.moved){
          const dt=Math.max(8,now-d.t);d.velocity=.5*d.velocity+.5*((this.mode==='gallery'?d.lastY-e.clientY:e.clientX-d.lastX)/dt);d.lastX=e.clientX;d.lastY=e.clientY;d.t=now;
          if(this.mode==='ring'){this.phase=d.phase+dx*.005;this.pitchTarget=Math.max(-.65,Math.min(.7,d.pitch+dy*.003))}
          else if(this.mode==='stack'){this.position=this.target=d.position-dx/(this.width<600?90:135)}
          else this.travelTarget=d.travel-dy/110+dx/230;
        }
      }this.wake();
    });
    const release=e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;
      if(d.moved&&e.type!=='pointercancel'){
        const v=performance.now()-d.t>90?0:d.velocity;
        if(this.mode==='ring')this.spinVelocity=Math.max(-.004,Math.min(.004,v*.003));
        else if(this.mode==='stack')this.target=Math.round(this.position-Math.max(-2.5,Math.min(2.5,v*.75)));
        else this.travelTarget+=Math.max(-3,Math.min(3,v*.65));
      }
      this.drag=null;s.classList.remove('dragging');if(s.hasPointerCapture(e.pointerId))s.releasePointerCapture(e.pointerId);setTimeout(()=>this.suppressClick=false,100);this.wake();
    };
    s.addEventListener('pointerup',release);s.addEventListener('pointercancel',release);
    s.addEventListener('pointerleave',()=>{this.pointer={x:0,y:0};this.hover=false;this.wake()});
    s.addEventListener('wheel',e=>{if(e.ctrlKey||e.target.closest('#scrubber-wrap'))return;e.preventDefault();const delta=Math.max(-180,Math.min(180,e.deltaY+e.deltaX));
      if(this.mode==='ring')this.zoomBy(-delta*.0022);
      else if(this.mode==='stack'){this.target+=delta*.012;clearTimeout(this.wheelTimer);this.wheelTimer=setTimeout(()=>{this.target=Math.round(this.target);this.wake()},150)}
      else this.travelTarget+=delta*.008;
      this.wake();
    },{passive:false});
    s.addEventListener('focusin',e=>{this.focused=e.target.matches(':focus-visible');this.wake()});s.addEventListener('focusout',e=>{if(!s.contains(e.relatedTarget)){this.focused=false;this.wake()}});
    document.addEventListener('visibilitychange',()=>{this.last=0;if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0}else this.wake()});
    document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>this.wake());new MutationObserver(()=>this.wake()).observe(d,{attributes:true,attributeFilter:['open']})});
  }
  wake(){if(!this.raf&&!document.hidden)this.raf=requestAnimationFrame(t=>this.frame(t))}
  frame(t){
    this.raf=0;const dt=Math.min(32,this.last?t-this.last:16);this.last=t;
    if(document.querySelector('dialog[open]')||document.hidden){this.last=0;return}
    const reduced=this.reduced.matches,rate=reduced?1:1-Math.exp(-dt/115),n=this.cards.length;
    let active=false;
    const ease=(name,target)=>{const delta=target-this[name];if(Math.abs(delta)>.0004){this[name]+=delta*rate;active=true}else this[name]=target};
    ease('zoom',this.zoomTarget);ease('pitch',this.pitchTarget);ease('position',this.target);ease('travel',this.travelTarget);ease('spread',this.expanded?1:0);
    if(this.mode==='ring'&&!this.drag){
      if(this.auto&&!reduced&&!this.hover&&!this.focused){this.phase+=dt*.000075;active=true}
      if(Math.abs(this.spinVelocity)>.00001&&!reduced){this.phase+=this.spinVelocity*dt;this.spinVelocity*=Math.exp(-dt/440);active=true}
    }
    const lx=(reduced?0:this.pointer.x)-this.look.x,ly=(reduced?0:this.pointer.y)-this.look.y;
    if(Math.abs(lx)+Math.abs(ly)>.0004){this.look.x+=lx*rate;this.look.y+=ly*rate;active=true}
    const w=this.width,h=this.height,mobile=w<600,scale=Math.min(w/1300,h/610),seed=i=>{const a=Math.sin(i*127.1+31.7)*43758.5453;return a-Math.floor(a)};
    const perspective=mobile?800:1200;this.world.style.perspective=perspective+'px';
    const settle=reduced?1:(this.drag?.moved?Math.min(1,rate*2.4):1-Math.exp(-dt/125));
    const index=n?((Math.round(this.position)%n)+n)%n:0;
    if(this.mode==='stack'&&this.reportedIndex!==index){this.reportedIndex=index;this.callbacks.index(index);const slider=document.querySelector('#scrubber');if(document.activeElement!==slider)slider.value=index;document.querySelector('#stack-number').textContent=`${String(index+1).padStart(2,'0')} / ${n}`}
    if(this.mode==='gallery'){const ix=((Math.floor(this.travel)%Math.max(n,1))+n)%Math.max(n,1);document.querySelector('#flight-count').textContent=`${String(ix+1).padStart(2,'0')} / ${n}`;document.querySelector('#flight-progress').style.height=((ix+1)/Math.max(1,n)*100)+'%'}
    this.cards.forEach((card,i)=>{
      let p={x:0,y:0,z:0,rx:0,ry:0,rz:0,w:0,h:0,a:1};const r=seed(i),r2=seed(i+98);
      if(this.mode==='ring'){
        const band=i%4,k=Math.floor(i/4),count=Math.ceil((n-band)/4),a=k/Math.max(count,1)*Math.PI*2+band*.54+this.phase*(.87+band*.07);
        const radius=(mobile?Math.min(w*.35,h*.34):Math.min(w*.275,h*.405))*(.73+band*.105+(r-.5)*.10);
        const x=Math.cos(a)*radius*(mobile?1:1.54),y=Math.sin(a)*radius,z=(r2-.5)*(mobile?160:300)+Math.sin(a*2+band)*35;
        const tilt=this.pitch+this.look.y*.10,turn=-.18+this.look.x*.19;
        const y1=y*Math.cos(tilt)-z*Math.sin(tilt),z1=y*Math.sin(tilt)+z*Math.cos(tilt);
        p.x=x*Math.cos(turn)+z1*Math.sin(turn);p.y=y1;p.z=-x*Math.sin(turn)+z1*Math.cos(turn)+perspective*(1-1/this.zoom);
        p.x+=this.look.x*12;p.y+=this.look.y*10;
        p.w=(mobile?22:44)+(mobile?14:34)*r;p.h=p.w*(i%3===0?.76:1.26);
        p.ry=Math.sin(a)*12;p.rx=-tilt*9;p.rz=(r2-.5)*10;
        p.a=Math.max(.32,Math.min(1,.78+p.z/1300));
      }else if(this.mode==='stack'){
        const d=((i-this.position+n/2)%n+n)%n-n/2,ad=Math.abs(d),direction=Math.sign(d),cw=Math.min(w*.48,270,h*.51),gap=cw*(.085+this.spread*.55);
        p.w=cw;p.h=cw*1.32;p.x=d*gap;p.y=-42+Math.pow(Math.min(ad,8),1.5)*3;
        p.z=85-Math.min(ad,12)*(25+this.spread*40);
        p.ry=-12-direction*Math.min(1,ad)*(-8+this.spread*57);p.rx=3+this.look.y*4;p.rz=direction*Math.min(ad,6)*.5;
        p.x+=this.look.x*10;p.y+=this.look.y*6;
        p.a=Math.max(0,1-Math.max(0,ad-5)*.32);
      }else{
        const spacing=340,span=Math.max(1,n)*spacing;let z=(this.travel-i)*spacing+360;z=((z+span-850)%span+span)%span-span+850;
        const lane=i%8,theta=lane/8*Math.PI*2+.21+(r-.5)*.25;
        const radius=mobile?Math.max(200,w*.59):Math.max(320,w*.34);
        p.x=Math.cos(theta)*radius*(.82+r*.6)-this.look.x*(mobile?90:190);p.y=Math.sin(theta)*radius*(mobile?1.25:.66)-this.look.y*130;
        p.z=z;p.w=(mobile?145:210)+r*90;p.h=p.w*(i%3===0?.78:1.25);
        p.ry=-Math.cos(theta)*18;p.rx=Math.sin(theta)*6;p.rz=(r2-.5)*7;
        p.a=Math.max(0,Math.min(1,(z+6200)/1700,(850-z)/170));
        if(n<8){const a=i/n*Math.PI*2+this.travel*.4,rad=n===1?0:Math.min(w*.32,h*.32);p.x=Math.cos(a)*rad;p.y=Math.sin(a)*rad*.65;p.z=-150+Math.sin(a)*120;p.a=1;p.w=Math.min(w*.40,220);p.h=p.w*1.28}
      }
      if(i>260&&this.mode==='ring')p.a=0;
      const c=this.poses[i];let changed=false;
      for(const key of ['x','y','z','rx','ry','rz','w','h','a']){const diff=p[key]-c[key];if(Math.abs(diff)>.025){c[key]+=diff*settle;changed=true}else c[key]=p[key]}
      if(changed)active=true;
      const on=c.a>.015&&c.z<perspective-70;
      card.style.visibility=on?'visible':'hidden';card.style.pointerEvents=on&&c.a>.16?'auto':'none';card.tabIndex=on&&c.a>.35?0:-1;card.setAttribute('aria-hidden',String(!on));
      if(!on)return;
      card.style.width=c.w.toFixed(2)+'px';card.style.height=c.h.toFixed(2)+'px';card.style.opacity=c.a.toFixed(3);
      card.style.transform=`translate(-50%,-50%) translate3d(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px,${c.z.toFixed(2)}px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg) rotateZ(${c.rz.toFixed(2)}deg)`;
      card.style.zIndex=String(Math.round(c.z+8000));
      const selected=this.mode==='stack'&&i===index;card.classList.toggle('selected',selected);
    });
    document.querySelector('#center-note').style.opacity=this.mode==='ring'&&n&&this.zoom<1.35?String(Math.max(0,1-(this.zoom-1)*3)):'0';
    if(active||this.dirty){this.dirty=false;this.wake()}else this.last=0;
  }
}
