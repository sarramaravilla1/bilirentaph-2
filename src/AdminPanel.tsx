import {useEffect, useState} from 'react';
import {supabase} from './supabase';

type Listing = {
  id:number; title:string; city:string; price:number; mode:string; type:string;
  beds:number; baths:number; area:number; description:string|null;
  lat:number; lng:number; status:string; image_url:string|null; photo_urls:string[]|null;
};
type Props = {onClose:()=>void; onUpdated:()=>void; onMessage:(message:string)=>void};
const peso=(value:number)=>'₱'+Number(value).toLocaleString('en-PH');

export function AdminPanel({onClose,onUpdated,onMessage}:Props){
  const [items,setItems]=useState<Listing[]>([]);
  const [filter,setFilter]=useState('pending');
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState<number|null>(null);
  const [authorized,setAuthorized]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const load=async()=>{
    if(!supabase)return;
    setLoading(true);
    const {data:admin,error:adminError}=await supabase.rpc('is_property_admin');
    if(adminError||!admin){setAuthorized(false);setLoading(false);onMessage(adminError?.message||'Admin access required.');return;}
    setAuthorized(true);
    const {data,error}=await supabase.from('properties')
      .select('id,title,city,price,mode,type,beds,baths,area,description,lat,lng,status,image_url,photo_urls')
      .order('created_at',{ascending:false});
    if(error)onMessage(error.message);else setItems((data||[]) as Listing[]);
    setLoading(false);
  };
  useEffect(()=>{void load();},[]);
  const review=async(item:Listing,decision:'approved'|'rejected')=>{
    if(!supabase||busyId!==null)return;
    if(!window.confirm(`${decision==='approved'?'Approve':'Reject'} “${item.title}”?`))return;
    setBusyId(item.id);
    try{
      const {error}=await supabase.rpc('review_property_listing',{
        p_property_id:item.id,p_decision:decision
      });
      if(error){onMessage(error.message);return;}
      onMessage(`Listing ${decision}.`);
      await load();onUpdated();
    }finally{setBusyId(null);}
  };
  const visible=items.filter(item=>filter==='all'||item.status===filter);
  return <div className="backdrop" onClick={onClose}>
    <section className="modal account-modal" role="dialog" aria-modal="true" aria-label="Admin dashboard" onClick={e=>e.stopPropagation()}>
      <button type="button" className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="modal-body">
        <h2>Admin dashboard</h2>
        {loading?<p>Loading listings…</p>:!authorized?<p>This account is not authorized to review listings.</p>:<>
          <p>Review submissions before publishing them to the public map.</p>
          <label>Show listings <select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="pending">Pending</option><option value="approved">Approved</option>
            <option value="rejected">Rejected</option><option value="all">All</option>
          </select></label>
          {visible.length===0?<p>No listings in this category.</p>:visible.map(item=>{
            const images=(item.photo_urls?.length?item.photo_urls:[item.image_url]).filter((x):x is string=>Boolean(x));
            const expanded=selected===item.id;
            return <article key={item.id} style={{borderBottom:'1px solid #ddd',padding:'16px 0'}}>
              <strong>{item.title}</strong> <small>({item.status})</small>
              <p>{item.city} · {item.mode} · {peso(item.price)}</p>
              <button type="button" onClick={()=>setSelected(expanded?null:item.id)}>{expanded?'Hide details':'Review details'}</button>
              {expanded&&<div style={{paddingTop:12}}>
                <p>{item.type} · {item.beds} bed · {item.baths} bath · {item.area} m²</p>
                <p style={{whiteSpace:'pre-wrap'}}>{item.description||'No description supplied.'}</p>
                <p>Coordinates: {item.lat}, {item.lng} (approximate)</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8}}>
                  {images.map(url=><a href={url} key={url} target="_blank" rel="noreferrer"><img src={url} alt="Property submission" style={{width:'100%',height:95,objectFit:'cover',borderRadius:6}}/></a>)}
                </div>
              </div>}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                {item.status!=='approved'&&<button type="button" disabled={busyId!==null} onClick={()=>void review(item,'approved')}>Approve</button>}
                {item.status!=='rejected'&&<button type="button" disabled={busyId!==null} onClick={()=>void review(item,'rejected')}>Reject</button>}
              </div>
            </article>;
          })}
        </>}
      </div>
    </section>
  </div>;
}
