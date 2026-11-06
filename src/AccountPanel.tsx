import {useEffect,useState,type FormEvent} from 'react';
import {supabase,configured} from './supabase';
import {X} from 'lucide-react';
import {LocationPicker} from './LocationPicker';
import './location-picker.css';

type Props={userId:string|null;onClose:()=>void;onUpdated:()=>void;onMessage:(s:string)=>void};
type MyListing={id:number;title:string;status:string};
const types=['House & Lot','Condominium','Townhouse','Lot','Apartment'];
const emptyForm=()=>({title:'',city:'',price:'',mode:'Buy',type:'House & Lot',beds:'1',baths:'1',area:'',lat:'',lng:'',description:''});

export function AccountPanel({userId,onClose,onUpdated,onMessage}:Props){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [register,setRegister]=useState(false);
  const [busy,setBusy]=useState(false);
  const [mine,setMine]=useState<MyListing[]>([]);
  const [form,setForm]=useState(emptyForm);
  const [photo,setPhoto]=useState<File|null>(null);

  useEffect(()=>{
    let cancelled=false;
    if(!supabase||!userId){setMine([]);return;}
    const client=supabase;
    void (async()=>{
      const {data,error}=await client.from('properties').select('id,title,status').eq('owner_id',userId).order('created_at',{ascending:false});
      if(!cancelled){if(error)onMessage(error.message);else setMine(data||[]);}
    })();
    return()=>{cancelled=true;};
  },[userId]);

  const loadMine=async()=>{
    if(!supabase||!userId)return;
    const {data,error}=await supabase.from('properties').select('id,title,status').eq('owner_id',userId).order('created_at',{ascending:false});
    if(error)onMessage(error.message);else setMine(data||[]);
  };

  const authenticate=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!supabase)return;
    setBusy(true);
    try{
      const {error}=register
        ?await supabase.auth.signUp({email,password})
        :await supabase.auth.signInWithPassword({email,password});
      onMessage(error?error.message:register?'Account request submitted. Check your email for a confirmation link if required.':'Signed in successfully.');
      if(!error&&!register)onClose();
    }catch(err){onMessage(err instanceof Error?err.message:'Authentication failed.');}
    finally{setBusy(false);}
  };

  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!supabase||!userId)return;
    const latitude=Number(form.lat),longitude=Number(form.lng);
    if(!form.lat||!form.lng||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<4||latitude>22||longitude<116||longitude>127){
      onMessage('Please select an approximate location within the Philippines on the map.');return;
    }
    if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5*1024*1024)){
      onMessage('Property photo must be JPEG, PNG, or WebP and no larger than 5 MB.');return;
    }
    setBusy(true);
    try{
      let image_url:string|null=null;
      let uploadedPath:string|null=null;
      if(photo){
        const ext=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg';
        const path=`${userId}/${crypto.randomUUID()}.${ext}`;
        const uploaded=await supabase.storage.from('property-photos').upload(path,photo,{contentType:photo.type});
        if(uploaded.error){onMessage(uploaded.error.message);return;}
        uploadedPath=path;
        image_url=supabase.storage.from('property-photos').getPublicUrl(path).data.publicUrl;
      }
      const {error}=await supabase.from('properties').insert({
        owner_id:userId,title:form.title.trim(),city:form.city.trim(),price:Number(form.price),
        mode:form.mode,type:form.type,beds:Number(form.beds),baths:Number(form.baths),
        area:Number(form.area),lat:latitude,lng:longitude,
        description:form.description.trim(),image_url,status:'pending'
      });
      if(error){
        if(uploadedPath)await supabase.storage.from('property-photos').remove([uploadedPath]);
        onMessage(error.message);return;
      }
      onMessage('Listing submitted for review. It will not be public until approved.');
      setForm(emptyForm());setPhoto(null);
      await loadMine();onUpdated();
    }catch(err){onMessage(err instanceof Error?err.message:'Could not submit property.');}
    finally{setBusy(false);}
  };

  return <div className="backdrop" onClick={onClose}>
    <section className="modal account-modal" role="dialog" aria-modal="true" aria-label="Account and property listing" onClick={e=>e.stopPropagation()}>
      <button type="button" className="close" onClick={onClose} aria-label="Close"><X/></button>
      <div className="modal-body">
        <h2>{userId?'My account & listings':'Welcome to BiliRentaPH'}</h2>
        {!configured?<p>Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel environment variables.</p>
        :!userId?<>
          <p>Sign in to save listings or submit a property.</p>
          <form className="account-form" onSubmit={authenticate}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <label>Password<input type="password" minLength={6} autoComplete={register?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
            <button className="primary-action" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button>
          </form>
          <button type="button" className="text-action" onClick={()=>setRegister(!register)}>{register?'Already registered? Sign in':'New here? Create an account'}</button>
        </>:<>
          <p>Your listings will be reviewed before appearing on the public map.</p>
          <form className="account-form" onSubmit={submit}>
            <h3>Submit a property</h3>
            <label>Property title<input required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
            <label>City / Province<input required maxLength={120} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
            <div className="form-grid">
              <label>For<select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}><option>Buy</option><option>Rent</option></select></label>
              <label>Property type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{types.map(x=><option key={x}>{x}</option>)}</select></label>
              <label>Price (₱)<input required type="number" min="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
              <label>Area (m²)<input required type="number" min="1" step="any" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/></label>
              <label>Bedrooms<input required type="number" min="0" value={form.beds} onChange={e=>setForm({...form,beds:e.target.value})}/></label>
              <label>Bathrooms<input required type="number" min="0" value={form.baths} onChange={e=>setForm({...form,baths:e.target.value})}/></label>
            </div>
            <h4>Property location</h4>
            <LocationPicker lat={form.lat} lng={form.lng} onChange={(lat,lng)=>setForm(previous=>({...previous,lat,lng}))}/>
            <label>Description<textarea rows={3} maxLength={2000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
            <label>Property photo (optional, up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
            <button className="primary-action" disabled={busy}>{busy?'Submitting…':'Submit for review'}</button>
          </form>
          <h3>My listings</h3>
          {mine.length?mine.map(x=><p className="my-listing" key={x.id}>{x.title} <strong>{x.status}</strong></p>):<p>No submissions yet.</p>}
          <button type="button" className="text-action" onClick={async()=>{await supabase?.auth.signOut();onClose();}}>Sign out</button>
        </>}
      </div>
    </section>
  </div>;
}
