import type {Project} from '@agentpay/shared';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {dataDir} from './data-dir.js';
const location=path.join(dataDir(),'projects.json');
export const fixture:Project[]=[{id:'web-001',title:'Business website development',clientName:'Example client (fictional)',status:'active',clientAmountPhp:60000,developerBudgetPhp:30000,milestones:[{id:'m-01',title:'UI implementation',assignee:'Demo developer A',merchantAddress:null,dueDate:'2026-11-06',status:'submitted',acceptanceCriteria:['Responsive layouts','Reviewed pull request'],evidence:[{type:'pr',url:'https://example.org/pull/1',passed:true}],testnetAmountXlm:'1.5'},{id:'m-02',title:'Backend integration',assignee:'Demo developer B',merchantAddress:null,dueDate:'2026-11-07',status:'planned',acceptanceCriteria:['API tests pass'],evidence:[],testnetAmountXlm:'2.0'},{id:'m-03',title:'Final deployment',assignee:'Demo developer A',merchantAddress:null,dueDate:'2026-11-07',status:'planned',acceptanceCriteria:['Deployment verified'],evidence:[],testnetAmountXlm:'1.0'}]}];
export function getProjects():Project[]{if(!existsSync(location))return structuredClone(fixture);try{return JSON.parse(readFileSync(location,'utf8')) as Project[]}catch{return structuredClone(fixture)}}
