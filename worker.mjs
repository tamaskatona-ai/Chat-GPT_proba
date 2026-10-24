import online from './multiplayer.js';
export class VegvarWorld {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.rates=new Map();
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS game (id INTEGER PRIMARY KEY, state TEXT NOT NULL)');
      const row=ctx.storage.sql.exec('SELECT state FROM game WHERE id=1').toArray()[0];
      this.world=online.createWorld(row?JSON.parse(row.state):undefined);
    });
  }
  async save(){
    const ends=this.world.data.players.map(p=>p.state.mission).filter(m=>['pvp','npc'].includes(m?.kind)).map(m=>m.ends);
    if(ends.length)await this.ctx.storage.setAlarm(Math.min(...ends));
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO game (id,state) VALUES (1,?)',JSON.stringify(this.world.data));
  }
  async fetch(request){
    await this.ready;
    return this.ctx.blockConcurrencyWhile(async()=>{
      const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();let rate=this.rates.get(ip);
      if(!rate||now-rate.at>60000){rate={at:now,count:0,joins:0};this.rates.set(ip,rate);}
      if(this.rates.size>4096)for(const [k,v] of this.rates)if(now-v.at>60000)this.rates.delete(k);
      if(++rate.count>240||(['/api/players','/api/cloud/register','/api/cloud/login'].includes(new URL(request.url).pathname)&&request.method==='POST'&&++rate.joins>10))return new Response(JSON.stringify({error:'Túl sok kérés. Várj egy percet.'}),{status:429,headers:{'Content-Type':'application/json','Retry-After':'60'}});
      const before=JSON.stringify(this.world.data);
      try{
        const response=await online.handleRequest(this.world,request,{allowedOrigins:this.env.ALLOWED_ORIGINS?.split(',')});
        await this.save();return response;
      }catch(error){this.world=online.createWorld(JSON.parse(before));return new Response(JSON.stringify({error:'A művelet nem menthető. Próbáld újra.'}),{status:500,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
    });
  }
  async alarm(){await this.ready;await this.ctx.blockConcurrencyWhile(async()=>{this.world.tick(Date.now());await this.save();});}
}
export default {
  async fetch(request,env){
    if(new URL(request.url).pathname.startsWith('/api/')){
      const response=await env.WORLD.get(env.WORLD.idFromName('vegvar-world')).fetch(request);
      const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGINS?.split(',')||['https://tamaskatona-ai.github.io','null'];
      // Include CORS even on storage errors and throttled responses.
      if(origin&&(origin===new URL(request.url).origin||allowed.includes(origin))){
        const wrapped=new Response(response.body,response);
        wrapped.headers.set('Access-Control-Allow-Origin',origin);
        wrapped.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
        wrapped.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
        wrapped.headers.set('Vary','Origin');return wrapped;
      }
      return response;
    }
    return env.ASSETS.fetch(request);
  }
};
