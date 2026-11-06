import {useEffect,useState,type FormEvent} from 'react';
import {supabase,configured} from './supabase';
import {X} from 'lucide-react';
import {LocationPicker} from './LocationPicker';
import './location-picker.css';

type Props={userId:string|null;onClose:()=>void;onUpdated:()=>void;onMessage:(s:string)=>void};
type MyListing={id:number;title:string;status:string;city:string;price:number;mode:string;type:string;beds:number;baths:number;area:number;lat:number;lng:number;description:string;image_url:string|null;photo_urls:string[]|null};
const types=['House & Lot','Condominium','Townhouse','Lot','Apartment'];
const emptyForm=()=>({title:'',city:'',price:'',mode:'Buy',type:'House & Lot',beds:'1',baths:'1',area:'',lat:'',lng:'',description:''});

export function AccountPanel({userId,onClose,onUpdated,onMessage}:Props){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [register,setRegister]=useState(false);
  const [authView,setAuthView]=useState<'login'|'forgot'|'reset'>('login');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [mine,setMine]=useState<MyListing[]>([]);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [existingPhotos,setExistingPhotos]=useState<string[]>([]);
  const [removingId,setRemovingId]=useState<number|null>(null);
  const [form,setForm]=useState(emptyForm);
  const [photos,setPhotos]=useState<File[]>([]);
  const [photoPreviews,setPhotoPreviews]=useState<string[]>([]);
  useEffect(()=>{
    const urls=photos.map(file=>URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return()=>urls.forEach(url=>URL.revokeObjectURL(url));
  },[photos]);

  useEffect(()=>{
    let cancelled=false;
    if(!supabase||!userId){setMine([]);return;}
    const client=supabase;
    void (async()=>{
      const {data,error}=await client.from('properties').select('id,title,status,city,price,mode,type,beds,baths,area,lat,lng,description,image_url,photo_urls').eq('owner_id',userId).order('created_at',{ascending:false});
      if(!cancelled){if(error)onMessage(error.message);else setMine(data||[]);}
    })();
    return()=>{cancelled=true;};
  },[userId]);

  const loadMine=async()=>{
    if(!supabase||!userId)return;
    const {data,error}=await supabase.from('properties').select('id,title,status,city,price,mode,type,beds,baths,area,lat,lng,description,image_url,photo_urls').eq('owner_id',userId).order('created_at',{ascending:false});
    if(error)onMessage(error.message);else setMine(data||[]);
  };

  useEffect(()=>{
    if(!supabase)return;
    const client=supabase;
    // Recovery links create a temporary authenticated session.
    const {data:{subscription}}=client.auth.onAuthStateChange(event=>{
      if(event==='PASSWORD_RECOVERY')setAuthView('reset');
    });
    // Handle recovery redirects even if the component mounts after the event.
    if(typeof window!=='undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))){
      setAuthView('reset');
    }
    return()=>subscription.unsubscribe();
  },[]);

  const requestPasswordReset=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!supabase)return;
    setBusy(true);
    try{
      const redirectTo=`${window.location.origin}/?password_reset=1`;
      const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
      onMessage(error?error.message:'If this email is registered, you will receive a password reset link. Check your inbox and spam folder.');
    }catch(err){onMessage(err instanceof Error?err.message:'Could not request password reset.');}
    finally{setBusy(false);}
  };

  const updatePassword=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!supabase)return;
    if(newPassword.length<8){onMessage('Use a password with at least 8 characters.');return;}
    if(newPassword!==confirmPassword){onMessage('Passwords do not match.');return;}
    setBusy(true);
    try{
      const {error}=await supabase.auth.updateUser({password:newPassword});
      if(error){onMessage(error.message);return;}
      onMessage('Your password has been updated successfully.');
      setNewPassword('');setConfirmPassword('');setAuthView('login');
      window.history.replaceState({},'',window.location.pathname);
    }catch(err){onMessage(err instanceof Error?err.message:'Could not update password.');}
    finally{setBusy(false);}
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

  const startEdit=(item:MyListing)=>{
    setEditingId(item.id);
    setExistingPhotos(item.photo_urls?.length?item.photo_urls:(item.image_url?[item.image_url]:[]));
    setPhotos([]);
    setForm({title:item.title,city:item.city,price:String(item.price),mode:item.mode,type:item.type,beds:String(item.beds),baths:String(item.baths),area:String(item.area),lat:String(item.lat),lng:String(item.lng),description:item.description||''});
    document.getElementById('property-form')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const cancelEdit=()=>{setEditingId(null);setExistingPhotos([]);setPhotos([]);setForm(emptyForm());};
  const storagePath=(url:string)=>{
    if(!supabase)return null;
    const marker='/storage/v1/object/public/property-photos/';
    const pos=url.indexOf(marker);
    if(pos<0)return null;
    const path=decodeURIComponent(url.slice(pos+marker.length).split('?')[0]);
    return path.startsWith(`${userId}/`)?path:null;
  };
  const removeListing=async(item:MyListing)=>{
    if(!supabase||!userId||busy||removingId!==null)return;
    if(!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`))return;
    setRemovingId(item.id);
    try{
      const {data,error}=await supabase.from('properties').delete().eq('id',item.id).eq('owner_id',userId).select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('Deletion was not permitted. Check the database policies.');
      const urls=item.photo_urls?.length?item.photo_urls:(item.image_url?[item.image_url]:[]);
      const paths=urls.map(storagePath).filter((x):x is string=>Boolean(x));
      if(paths.length){const result=await supabase.storage.from('property-photos').remove(paths);if(result.error)onMessage('Listing deleted, but some photos could not be removed from storage: '+result.error.message);else onMessage('Listing deleted.');}
      else onMessage('Listing deleted.');
      if(editingId===item.id)cancelEdit();
      await loadMine();onUpdated();
    }catch(err){onMessage(err instanceof Error?err.message:'Could not delete listing.');}
    finally{setRemovingId(null);}
  };

  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!supabase||!userId)return;
    const latitude=Number(form.lat),longitude=Number(form.lng);
    if(!form.lat||!form.lng||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<4||latitude>22||longitude<116||longitude>127){
      onMessage('Please select an approximate location within the Philippines on the map.');return;
    }
    if(photos.length+existingPhotos.length>10){onMessage('Choose no more than 10 photos total.');return;}
    if(photos.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){
      onMessage('Each photo must be JPEG, PNG, or WebP and no larger than 5 MB.');return;
    }
    setBusy(true);
    try{
      const uploadedPaths:string[]=[];
      const photo_urls:string[]=[...existingPhotos];
      for(const file of photos){
        const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
        const path=`${userId}/${crypto.randomUUID()}.${ext}`;
        const uploaded=await supabase.storage.from('property-photos').upload(path,file,{contentType:file.type});
        if(uploaded.error){
          if(uploadedPaths.length)await supabase.storage.from('property-photos').remove(uploadedPaths);
          onMessage(`Photo upload failed: ${uploaded.error.message}`);return;
        }
        uploadedPaths.push(path);
        photo_urls.push(supabase.storage.from('property-photos').getPublicUrl(path).data.publicUrl);
      }
      const image_url=photo_urls[0]??null;
      const payload={title:form.title.trim(),city:form.city.trim(),price:Number(form.price),
        mode:form.mode,type:form.type,beds:Number(form.beds),baths:Number(form.baths),
        area:Number(form.area),lat:latitude,lng:longitude,
        description:form.description.trim(),image_url,photo_urls,status:'pending'};
      const result=editingId===null
        ?await supabase.from('properties').insert({...payload,owner_id:userId})
        :await supabase.from('properties').update(payload).eq('id',editingId).eq('owner_id',userId).select('id');
      const error=result.error;
      if(!error&&editingId!==null&&(!result.data||result.data.length===0)){
        if(uploadedPaths.length)await supabase.storage.from('property-photos').remove(uploadedPaths);
        onMessage('Update was not permitted. Check the database policies.');return;
      }
      if(error){
        if(uploadedPaths.length)await supabase.storage.from('property-photos').remove(uploadedPaths);
        onMessage(error.message);return;
      }
      if(editingId!==null){
        const original=mine.find(x=>x.id===editingId);
        const previous=original?.photo_urls?.length?original.photo_urls:(original?.image_url?[original.image_url]:[]);
        const removed=previous.filter(url=>!photo_urls.includes(url)).map(storagePath).filter((x):x is string=>Boolean(x));
        if(removed.length){const cleanup=await supabase.storage.from('property-photos').remove(removed);if(cleanup.error)onMessage('Listing updated, but removed photos could not be cleaned up: '+cleanup.error.message);}
      }
      onMessage(editingId===null?'Listing submitted for review. It will not be public until approved.':'Listing updated and sent for review. It is hidden from public listings until approved again.');
      cancelEdit();
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
        :authView==='reset'?<>
          <p>Choose a new password for your BiliRentaPH account.</p>
          <form className="account-form" onSubmit={updatePassword}>
            <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>
            <button className="primary-action" disabled={busy}>{busy?'Updating…':'Save new password'}</button>
          </form>
        </>:!userId?authView==='forgot'?<>
          <p>Enter your registered email address. We’ll send you a password reset link.</p>
          <form className="account-form" onSubmit={requestPasswordReset}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <button className="primary-action" disabled={busy}>{busy?'Sending…':'Send password reset link'}</button>
          </form>
          <button type="button" className="text-action" onClick={()=>setAuthView('login')}>Back to sign in</button>
        </>:<>
          <p>Sign in to save listings or submit a property.</p>
          <form className="account-form" onSubmit={authenticate}>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <label>Password<input type="password" minLength={6} autoComplete={register?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
            <button className="primary-action" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button>
          </form>
          {!register&&<button type="button" className="text-action" onClick={()=>setAuthView('forgot')}>Forgot password?</button>}
          <button type="button" className="text-action" onClick={()=>setRegister(!register)}>{register?'Already registered? Sign in':'New here? Create an account'}</button>
        </>:<>
          <p>Your listings will be reviewed before appearing on the public map.</p>
          <form id="property-form" className="account-form" onSubmit={submit}>
            <h3>{editingId===null?'Submit a property':'Edit property listing'}</h3>
            {editingId!==null&&<p className="form-hint">Changes to an approved listing will require another review before becoming public.</p>}
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
            {existingPhotos.length>0&&<><p className="form-hint">Existing photos ({existingPhotos.length}). Remove any you no longer want. The first remaining photo is the cover.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(105px,1fr))',gap:10}}>
                {existingPhotos.map((url,i)=><div key={url} style={{position:'relative'}}><img src={url} alt={`Existing property photo ${i+1}`} style={{width:'100%',height:90,objectFit:'cover',borderRadius:8}}/><button type="button" onClick={()=>setExistingPhotos(old=>old.filter(x=>x!==url))} aria-label={`Remove existing photo ${i+1}`}>Remove</button></div>)}
              </div></>}
            <label>Property photos (up to 10 total, 5 MB each)<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{const chosen=Array.from(e.target.files||[]);if(chosen.length+existingPhotos.length>10){onMessage('Please select no more than 10 photos total.');e.target.value='';return;}setPhotos(chosen);}}/></label>
            {photos.length>0&&<><p className="form-hint">{photos.length} photo(s) selected. The first photo will be the cover if no existing photos remain.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(105px,1fr))',gap:10}}>
                {photoPreviews.map((url,i)=><div key={url} style={{position:'relative'}}>
                  <img src={url} alt={`Selected property photo ${i+1}`} style={{width:'100%',height:90,objectFit:'cover',borderRadius:8}}/>
                  <small>{i===0?'Cover':`Photo ${i+1}`}</small>
                </div>)}
              </div>
            </>}
            <button className="primary-action" disabled={busy||removingId!==null}>{busy?'Saving…':editingId===null?'Submit for review':'Save changes for review'}</button>
            {editingId!==null&&<button type="button" className="text-action" onClick={cancelEdit} disabled={busy}>Cancel editing</button>}
          </form>
          <h3>My listings</h3>
          {mine.length?mine.map(x=><div className="my-listing" key={x.id} style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><span style={{flex:'1 1 180px'}}>{x.title} <strong>{x.status}</strong></span><button type="button" onClick={()=>startEdit(x)} disabled={busy||removingId!==null}>Edit</button><button type="button" onClick={()=>void removeListing(x)} disabled={busy||removingId!==null}>{removingId===x.id?'Deleting…':'Delete'}</button></div>):<p>No submissions yet.</p>}
          <button type="button" className="text-action" onClick={async()=>{await supabase?.auth.signOut();onClose();}}>Sign out</button>
        </>}
      </div>
    </section>
  </div>;
}
