import {useEffect,useRef,useState} from 'react';
import maplibregl,{type Map as MapLibreMap,type Marker} from 'maplibre-gl';

type Props={lat:string;lng:string;onChange:(lat:string,lng:string)=>void};
type Place={display_name:string;lat:string;lon:string};
const PH_BOUNDS:[number,number,number,number]=[116,4,127,22];
export function LocationPicker({lat,lng,onChange}:Props){
 const container=useRef<HTMLDivElement|null>(null);
 const map=useRef<MapLibreMap|null>(null);
 const marker=useRef<Marker|null>(null);
 const onChangeRef=useRef(onChange);
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<Place[]>([]);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{onChangeRef.current=onChange},[onChange]);
 useEffect(()=>{
  if(!container.current)return;
  const m=new maplibregl.Map({container:container.current,style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},center:[121.05,14.6],zoom:9});
  map.current=m;
  m.addControl(new maplibregl.NavigationControl(),'top-right');
  m.on('click',e=>onChangeRef.current(e.lngLat.lat.toFixed(6),e.lngLat.lng.toFixed(6)));
  const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  return()=>{resize.disconnect();marker.current?.remove();marker.current=null;m.remove();map.current=null};
 },[]);
 useEffect(()=>{
  const la=Number(lat),lo=Number(lng);
  if(!lat||!lng||!Number.isFinite(la)||!Number.isFinite(lo))return;
  if(!marker.current){
   marker.current=new maplibregl.Marker({color:'#176449',draggable:true}).setLngLat([lo,la]).addTo(map.current!);
   marker.current.on('dragend',()=>{const p=marker.current!.getLngLat();onChangeRef.current(p.lat.toFixed(6),p.lng.toFixed(6))});
  }else marker.current.setLngLat([lo,la]);
 },[lat,lng]);
 const search=async()=>{
  if(query.trim().length<3){setError('Enter at least 3 characters.');return}
  setSearching(true);setError('');setResults([]);
  try{
   const url=new URL('https://nominatim.openstreetmap.org/search');
   url.searchParams.set('q',query.trim());url.searchParams.set('format','jsonv2');url.searchParams.set('limit','5');url.searchParams.set('countrycodes','ph');
   const response=await fetch(url.toString(),{headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('Search unavailable. Try again shortly.');
   const data=await response.json() as Place[];setResults(data);if(!data.length)setError('No Philippine locations found. Try a nearby city or municipality.');
  }catch(e){setError(e instanceof Error?e.message:'Location search failed.')}finally{setSearching(false)}
 };
 const choose=(place:Place)=>{
  const la=Number(place.lat),lo=Number(place.lon);
  if(!Number.isFinite(la)||!Number.isFinite(lo)||lo<PH_BOUNDS[0]||la<PH_BOUNDS[1]||lo>PH_BOUNDS[2]||la>PH_BOUNDS[3])return;
  onChange(la.toFixed(6),lo.toFixed(6));map.current?.flyTo({center:[lo,la],zoom:14});setQuery(place.display_name);setResults([]);
 };
 return <div className="location-picker">
  <label>Search location in the Philippines<input type="search" placeholder="e.g. Antipolo, Rizal" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search()}}}/></label>
  <button type="button" className="location-search-button" disabled={searching} onClick={()=>void search()}>{searching?'Searching…':'Search location'}</button>
  {error&&<p className="form-hint" role="status">{error}</p>}
  {results.length>0&&<div className="location-results">{results.map((p,i)=><button key={`${p.lat}-${p.lon}-${i}`} type="button" onClick={()=>choose(p)}>{p.display_name}</button>)}</div>}
  <div ref={container} className="location-picker-map" aria-label="Choose an approximate property location on the map"/>
  <p className="form-hint">Click the map to place a pin, or drag the pin to adjust. Select an approximate location for privacy.</p>
  <p className="form-hint">{lat&&lng?`Selected: ${lat}, ${lng}`:'No location selected yet.'}</p>
 </div>
}
