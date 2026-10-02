import type { ShareSnapshot } from '../types/virtualProfile'
import { weatherVisual, weatherTemperature } from './weather'

// 海报和卡片严格取自同一快照，绘制时不再读取时钟或私人档案。
export function drawPoster(ctx: UniApp.CanvasContext, snapshot: ShareSnapshot, images: Record<string, string> = {}) {
  const width=600, height=920
  ctx.setFillStyle('#fff7ea'); ctx.fillRect(0,0,width,height)
  ctx.setFillStyle('#74553d'); ctx.setFontSize(30); ctx.fillText('对面的我',36,56)
  ctx.setFontSize(16);ctx.setFillStyle('#9a826d');ctx.fillText('分享时刻的快照 · 两个世界，同一个瞬间',36,86)
  function lines(text:string,x:number,y:number,maxWidth:number,size:number,lineHeight:number,maxLines=4) {
    ctx.setFontSize(size)
    const result:string[]=[];let line=''
    for(const char of text){if(ctx.measureText(line+char).width>maxWidth){result.push(line);line=char}else line+=char}
    if(line)result.push(line)
    result.slice(0,maxLines).forEach((value,i)=>ctx.fillText(i===maxLines-1&&result.length>maxLines?value.slice(0,-1)+'…':value,x,y+i*lineHeight))
    return y+Math.min(result.length,maxLines)*lineHeight
  }
  for(const [index,world] of [snapshot.originWorld,snapshot.targetWorld].entries()){
    const x=36+index*270
    ctx.setFillStyle(world.isDay?'#f9dfb1':'#40546b');ctx.fillRect(x,112,258,225)
    ctx.setFillStyle(world.isDay?'#694b32':'#fff4df');ctx.setFontSize(18)
    ctx.fillText(index===0?'你的世界':'对面的世界',x+16,141)
    if(world.weather){
      const asset=weatherVisual(world.weather.code,world.isDay).asset
      if(images[asset])ctx.drawImage(images[asset],x+194,119,52,52)
    }
    lines(world.place,x+16,170,226,22,28,2)
    ctx.setFontSize(40);ctx.fillText(world.time,x+16,246)
    if(world.weather){ctx.setFontSize(16);ctx.fillText(weatherTemperature(world.weather),x+152,246)}
    ctx.setFontSize(16);ctx.fillText(`${world.relativeDay} · ${world.date}`,x+16,276)
    ctx.fillText(world.dayNight,x+16,302)
    if(world.weather){ctx.setFontSize(14);ctx.fillText(world.weather.text,x+86,302)}
    ctx.setFontSize(12);lines(world.timeLabel,x+16,324,228,12,14,1)
  }
  ctx.setFillStyle('#fffdf8');ctx.fillRect(36,362,528,350)
  ctx.setFillStyle('#8c735d');ctx.setFontSize(18);ctx.fillText(snapshot.avatar.name+' · 此刻',58,395)
  ctx.setFillStyle('#483d35');let y=lines('它正在'+snapshot.currentTitle,58,433,478,27,34,2)
  // 简洁场景插画：海面、舷窗、船舱书桌和角色活动道具。
  ctx.setFillStyle(snapshot.scene.isDay?'#e9d8be':'#66616a');ctx.fillRect(58,y+10,484,120)
  ctx.setFillStyle(snapshot.scene.isDay?'#d6e5de':'#283a52');ctx.fillRect(76,y+24,114,70)
  if(snapshot.scene.habitat==='boat_cabin'){
    ctx.setFillStyle('#789da5');ctx.fillRect(76,y+68,114,26)
    ctx.setStrokeStyle('#c4dcdb');for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(76,y+74+n*7);ctx.lineTo(190,y+74+n*7);ctx.stroke()}
  }
  ctx.setFillStyle('#ac8263');ctx.fillRect(338,y+76,166,8)
  ctx.setFillStyle('#483d35');ctx.setFontSize(27)
  ctx.fillText(snapshot.currentState==='sleeping'?'Z z':snapshot.currentState==='studying'?'▤':snapshot.currentState==='working'?'▣':'☕',410,y+70)
  ctx.setFontSize(16);ctx.fillText(snapshot.scene.title,210,y+60)
  ctx.setFillStyle('#483d35');y=lines(snapshot.currentDescription,58,y+158,482,19,28,3)
  ctx.setFillStyle('#9a7350');y=lines(snapshot.connectionText,36,752,528,20,28,2)
  ctx.setFillStyle('#74553d');lines(snapshot.dailyStory.title+' · '+snapshot.dailyStory.text,36,824,528,17,24,2)
  ctx.setFillStyle('#a38b77');ctx.setFontSize(13);ctx.fillText('虚拟生活 · 时间与内容停留在分享的这一刻',36,896)
  if(snapshot.originWorld.weather || snapshot.targetWorld.weather){ctx.setFontSize(12);ctx.fillText('天气服务由和风天气提供',380,896)}
  return {width,height}
}

export function drawShareCard(ctx:UniApp.CanvasContext,snapshot:ShareSnapshot,images:Record<string,string>={}){
  ctx.setFillStyle('#fff7ea');ctx.fillRect(0,0,600,480)
  for(const [i,w] of [snapshot.originWorld,snapshot.targetWorld].entries()){
    const x=20+i*290
    ctx.setFillStyle(w.isDay?'#f9dfb1':'#40546b');ctx.fillRect(x,20,280,230)
    ctx.setFillStyle(w.isDay?'#694b32':'#fff4df');ctx.setFontSize(19);ctx.fillText(i===0?'你的世界':'对面的世界',x+16,53)
    if(w.weather){const asset=weatherVisual(w.weather.code,w.isDay).asset;if(images[asset])ctx.drawImage(images[asset],x+216,28,52,52)}
    ctx.setFontSize(21)
    const chars=[...w.place];let line='',row=0
    for(const ch of chars){if(ctx.measureText(line+ch).width>248){ctx.fillText(line,x+16,89+row*26);row++;line=ch}else line+=ch}
    if(row<2)ctx.fillText(line,x+16,89+row*26)
    ctx.setFontSize(38);ctx.fillText(w.time,x+16,171)
    if(w.weather){ctx.setFontSize(16);ctx.fillText(weatherTemperature(w.weather),x+174,171)}
    ctx.setFontSize(16);ctx.fillText(w.relativeDay+' · '+w.date,x+16,202)
    ctx.setFontSize(16);ctx.fillText(w.dayNight+(w.estimated?' · 估算':''),x+16,230)
    if(w.weather){ctx.setFontSize(14);ctx.fillText(w.weather.text,x+124,230)}
  }
  ctx.setFillStyle('#74553d');ctx.setFontSize(18);ctx.fillText(snapshot.avatar.name+' · '+snapshot.scene.title,28,292)
  ctx.setFillStyle('#483d35');ctx.setFontSize(27);ctx.fillText('它正在'+snapshot.currentTitle,28,336)
  ctx.setFillStyle(snapshot.scene.isDay?'#d4e4df':'#40546b');ctx.fillRect(28,357,544,84)
  if(snapshot.scene.habitat==='boat_cabin'){ctx.setFillStyle('#789da5');ctx.fillRect(28,404,544,37)}
  ctx.setFillStyle(snapshot.scene.isDay?'#74553d':'#fff4df');ctx.setFontSize(22)
  ctx.fillText(snapshot.currentState==='sleeping'?'Z z · 小屋里的安静时刻':snapshot.currentState==='working'?'▣ · 书桌前的专注时刻':snapshot.currentState==='studying'?'▤ · 读到新的一页':'☕ · 慢慢记录今天',48,391)
  ctx.setFillStyle('#9a826d');ctx.setFontSize(15);ctx.fillText('分享时刻的快照 · 对面的我',28,466)
  if(snapshot.originWorld.weather || snapshot.targetWorld.weather){ctx.setFontSize(12);ctx.fillText('天气服务由和风天气提供',402,466)}
  return {width:600,height:480}
}

export async function renderPoster(snapshot:ShareSnapshot, canvasId:string, component:unknown,format:'poster'|'card'='poster'):Promise<string>{
  const images:Record<string,string>={}
  const assets=[...new Set([snapshot.originWorld,snapshot.targetWorld].filter(w=>w.weather).map(w=>weatherVisual(w.weather!.code,w.isDay).asset))]
  await Promise.all(assets.map(asset=>new Promise<void>((resolve,reject)=>uni.getImageInfo({src:'/static/weather/'+asset+'.png',success:r=>{images[asset]=r.path.startsWith('static/')?'/'+r.path:r.path;resolve()},fail:reject}))))
  return new Promise((resolve,reject)=>{
    const ctx=uni.createCanvasContext(canvasId,component as any)
    const {width,height}=format==='card'?drawShareCard(ctx,snapshot,images):drawPoster(ctx,snapshot,images)
    ctx.draw(false,()=>uni.canvasToTempFilePath({canvasId,x:0,y:0,width,height,destWidth:width*2,destHeight:height*2,
      fileType:'png',success:r=>resolve(r.tempFilePath),fail:reject},component as any))
  })
}
export async function savePoster(path:string){
  try { await new Promise<void>((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:path,success:()=>resolve(),fail:reject}));uni.showToast({title:'已保存到相册',icon:'success'}) }
  catch(error){
    const message=(error as {errMsg?:string})?.errMsg || ''
    if(/auth deny|authorize|denied/.test(message)){
      uni.showModal({title:'允许保存到相册',content:'在设置里允许相册访问，再点击保存海报。',confirmText:'去设置',success:result=>{if(result.confirm)uni.openSetting({})}})
    }else uni.showToast({title:'保存失败，请重试',icon:'none'})
  }
}
