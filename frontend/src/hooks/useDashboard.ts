import {useEffect,useState} from 'react';
import {getDashboardOverview} from '../api/client';
import type {DashboardOverview} from '../types/api';
export const useDashboard=()=>{const[data,setData]=useState<DashboardOverview|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<Error|null>(null);useEffect(()=>{let m=true;getDashboardOverview().then(r=>m&&setData(r)).catch(e=>m&&setError(e instanceof Error?e:new Error('Failed to load dashboard.'))).finally(()=>m&&setLoading(false));return()=>{m=false}},[]);return{data,loading,error}};
