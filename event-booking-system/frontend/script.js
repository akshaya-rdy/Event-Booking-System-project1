const $ = id => document.getElementById(id);
const api = async (path,options={}) => {
  let response;
  try {response=await fetch('/api'+path,{headers:{'Content-Type':'application/json'},...options});}
  catch {throw new Error('Cannot reach the server. Check that Node.js is running.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Something went wrong');
  return data;
};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=s=>new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
let events=[];let toastTimer;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500)}
function busy(button,on){button.disabled=on;if(on){button.dataset.original=button.textContent;button.textContent='Please wait…'}else button.textContent=button.dataset.original||button.textContent}
function render(){const q=$('search').value.toLowerCase().trim(),category=$('categoryFilter').value;const filtered=events.filter(e=>(!category||e.category===category)&&[e.title,e.description,e.location].some(s=>s.toLowerCase().includes(q)));$('eventCount').textContent=`${filtered.length} event${filtered.length===1?'':'s'}`;
$('eventsGrid').innerHTML=filtered.length?filtered.map(e=>`<article class="event-card"><span class="pill">${escapeHTML(e.category)}</span><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.description)}</p><div class="meta">📅 ${escapeHTML(formatDate(e.event_date))}</div><div class="meta">📍 ${escapeHTML(e.location)}</div><div class="meta">👥 ${e.capacity} total spots</div><div class="card-actions"><button class="primary" data-action="book" data-id="${e.id}">Book now</button><button class="secondary" data-action="edit" data-id="${e.id}">Edit</button><button class="secondary" data-action="delete" data-id="${e.id}">Delete</button></div></article>`).join(''):'<div class="empty">No events found. Try another search or create the first event.</div>';
const selected=$('categoryFilter').value;const cats=[...new Set(events.map(e=>e.category))].sort();$('categoryFilter').innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');$('categoryFilter').value=cats.includes(selected)?selected:'';
}
async function loadEvents(){ $('eventsGrid').innerHTML='<div class="empty">Loading events…</div>';try{events=await api('/events');render()}catch(e){$('eventsGrid').innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`;notify(e.message)}}
$('search').addEventListener('input',render);$('categoryFilter').addEventListener('change',render);$('refresh').addEventListener('click',loadEvents);
$('eventsGrid').addEventListener('click',async ev=>{const btn=ev.target.closest('button[data-action]');if(!btn)return;const e=events.find(x=>x.id===btn.dataset.id);if(!e)return;
if(btn.dataset.action==='book'){$('bookingEventId').value=e.id;$('bookingHeading').textContent=e.title;$('bookingDialog').showModal()}
if(btn.dataset.action==='edit'){for(const field of ['title','description','category','location','capacity'])$(field).value=e[field];const d=new Date(e.event_date);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);$('eventDate').value=local;$('editId').value=e.id;$('formTitle').textContent='Edit event';$('saveEvent').textContent='Save changes';$('cancelEdit').hidden=false;location.hash='manage'}
if(btn.dataset.action==='delete'){if(!confirm(`Delete "${e.title}" and all its bookings?`))return;busy(btn,true);try{await api('/events/'+e.id,{method:'DELETE'});notify('Event deleted');await loadEvents()}catch(err){notify(err.message)}finally{busy(btn,false)}}
});
function resetEdit(){$('eventForm').reset();$('editId').value='';$('formTitle').textContent='Create an event';$('saveEvent').textContent='Publish event';$('cancelEdit').hidden=true}
$('cancelEdit').addEventListener('click',resetEdit);
$('eventForm').addEventListener('submit',async ev=>{ev.preventDefault();const btn=$('saveEvent');const id=$('editId').value;const body={title:$('title').value,description:$('description').value,category:$('category').value,location:$('location').value,capacity:Number($('capacity').value),event_date:new Date($('eventDate').value).toISOString()};busy(btn,true);try{await api(id?'/events/'+id:'/events',{method:id?'PUT':'POST',body:JSON.stringify(body)});notify(id?'Event updated':'Event published');resetEdit();await loadEvents();location.hash='events'}catch(e){notify(e.message)}finally{busy(btn,false)}});
$('closeDialog').addEventListener('click',()=>$('bookingDialog').close());
$('bookingForm').addEventListener('submit',async ev=>{ev.preventDefault();const btn=$('confirmBooking');busy(btn,true);try{await api('/bookings',{method:'POST',body:JSON.stringify({event_id:$('bookingEventId').value,attendee_name:$('attendeeName').value,attendee_email:$('attendeeEmail').value})});notify('Booking confirmed!');$('bookingDialog').close();$('bookingForm').reset()}catch(e){notify(e.message)}finally{busy(btn,false)}});
async function loadBookings(){const email=$('lookupEmail').value.trim();$('bookingResults').innerHTML='<div class="empty">Loading bookings…</div>';try{const list=await api('/bookings?email='+encodeURIComponent(email));$('bookingResults').innerHTML=list.length?list.map(b=>`<div class="booking-item"><div><strong>${escapeHTML(b.events?.title||'Deleted event')}</strong><span class="meta">${escapeHTML(formatDate(b.events?.event_date||b.created_at))} · ${escapeHTML(b.events?.location||'')}</span><p>Booked for ${escapeHTML(b.attendee_name)}</p></div><button class="secondary" data-booking="${b.id}">Cancel booking</button></div>`).join(''):'<div class="empty">No bookings found for this email.</div>'}catch(e){$('bookingResults').innerHTML=`<div class="empty">${escapeHTML(e.message)}</div>`}}
$('lookupForm').addEventListener('submit',ev=>{ev.preventDefault();loadBookings()});
$('bookingResults').addEventListener('click',async ev=>{const btn=ev.target.closest('button[data-booking]');if(!btn||!confirm('Cancel this booking?'))return;busy(btn,true);try{await api('/bookings/'+btn.dataset.booking,{method:'DELETE',body:JSON.stringify({email:$('lookupEmail').value})});notify('Booking cancelled');await loadBookings()}catch(e){notify(e.message)}finally{busy(btn,false)}});
loadEvents();
