const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabase');
const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(__dirname,'../frontend')));
const validId = x => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const fail = (res,error) => { console.error('Database error:',error); return res.status(500).json({error:'Database operation failed. Check server configuration and schema.'}); };
const eventFields = ['title','description','category','location','event_date','capacity'];
function validateEvent(body,partial=false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid event data';
  if (Object.keys(body).some(k=>!eventFields.includes(k))) return 'Unexpected event field';
  if (!partial && eventFields.some(k=>body[k]===undefined)) return 'All event fields are required';
  if (partial && !Object.keys(body).length) return 'Provide a field to update';
  for (const k of ['title','description','category','location']) if (body[k]!==undefined && (typeof body[k]!=='string'||!body[k].trim()||body[k].length> (k==='description'?1000:120))) return `Invalid ${k}`;
  if (body.capacity!==undefined && (!Number.isInteger(body.capacity)||body.capacity<1||body.capacity>10000)) return 'Capacity must be 1–10000';
  if (body.event_date!==undefined && (typeof body.event_date!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(body.event_date)||!Number.isFinite(Date.parse(body.event_date)))) return 'Invalid event date';
  return null;
}
const clean = obj => Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,typeof v==='string'?v.trim():v]));
app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.get('/api/events',async(req,res)=>{
  const {data,error}=await supabase.from('events').select('*').order('event_date',{ascending:true});
  if(error)return fail(res,error); res.json(data);
});
app.post('/api/events',async(req,res)=>{
  const problem=validateEvent(req.body);if(problem)return res.status(400).json({error:problem});
  const {data,error}=await supabase.from('events').insert(clean(req.body)).select().single();
  if(error)return fail(res,error);res.status(201).json(data);
});
app.put('/api/events/:id',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({error:'Invalid event ID'});
  const problem=validateEvent(req.body,true);if(problem)return res.status(400).json({error:problem});
  const {data,error}=await supabase.from('events').update(clean(req.body)).eq('id',req.params.id).select().maybeSingle();
  if(error)return fail(res,error);if(!data)return res.status(404).json({error:'Event not found'});res.json(data);
});
app.delete('/api/events/:id',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({error:'Invalid event ID'});
  const {data,error}=await supabase.from('events').delete().eq('id',req.params.id).select('id').maybeSingle();
  if(error)return fail(res,error);if(!data)return res.status(404).json({error:'Event not found'});res.json({message:'Event deleted'});
});
app.get('/api/bookings',async(req,res)=>{
  const email=String(req.query.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'Valid email required'});
  const {data,error}=await supabase.from('bookings').select('id,event_id,attendee_name,attendee_email,created_at,events(title,event_date,location)').eq('attendee_email',email).order('created_at',{ascending:false});
  if(error)return fail(res,error);res.json(data);
});
app.post('/api/bookings',async(req,res)=>{
  const {event_id,attendee_name,attendee_email}=req.body||{};
  if(!validId(event_id)||typeof attendee_name!=='string'||!attendee_name.trim()||attendee_name.length>120||typeof attendee_email!=='string'||attendee_email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee_email))return res.status(400).json({error:'Valid event, name and email required'});
  const {data,error}=await supabase.rpc('reserve_event',{p_event_id:event_id,p_name:attendee_name.trim(),p_email:attendee_email.trim().toLowerCase()});
  if(error){if(error.message.includes('EVENT_FULL'))return res.status(409).json({error:'Event is fully booked'});if(error.message.includes('ALREADY_BOOKED'))return res.status(409).json({error:'This email already booked the event'});if(error.message.includes('EVENT_NOT_FOUND'))return res.status(404).json({error:'Event not found'});return fail(res,error)}
  res.status(201).json({id:data,message:'Booking confirmed'});
});
app.delete('/api/bookings/:id',async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({error:'Invalid booking ID'});
  const email=String(req.body?.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Valid email required'});
  const {data,error}=await supabase.from('bookings').delete().eq('id',req.params.id).eq('attendee_email',email).select('id').maybeSingle();
  if(error)return fail(res,error);if(!data)return res.status(404).json({error:'Booking not found for this email'});res.json({message:'Booking cancelled'});
});
app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'}));
app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:'Invalid request'});});
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log(`Open http://localhost:${port}`));
