import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterLaws, calculateFine, rankLaws, validateSnapshot, money} from '../frontend/js/domain.mjs';
const data=JSON.parse(readFileSync(new URL('../frontend/data/snapshot.json',import.meta.url),'utf8'));
const ka=data.jurisdictions.find(j=>j.name==='Karnataka').id;
const row=data.laws.find(r=>r.jurisdiction_id===ka);
test('offline snapshot retains filter and calculator identifiers',()=>assert.ok(validateSnapshot(data)));
test('state, category and search filters compose',()=>{
  assert.equal(filterLaws(data.laws,{jurisdiction:ka,category:row.category_id,search:'194D'}).length,1);
  assert.equal(filterLaws(data.laws,{jurisdiction:ka,search:'insurance'}).length,0);
});
test('offline first and repeat offence amounts use the selected region',()=>{
  const selection={jurisdiction:ka,violation:row.violation_id,vehicle:row.vehicle_class_id};
  assert.equal(calculateFine(data.laws,selection).fine_amount,500);
  assert.equal(calculateFine(data.laws,{...selection,repeat:true}).fine_amount,1000);
});
test('no silent national or other vehicle fallback',()=>{
  assert.equal(calculateFine(data.laws,{jurisdiction:ka,violation:row.violation_id,vehicle:999}),null);
  assert.equal(calculateFine(data.laws,{jurisdiction:ka,violation:999,vehicle:row.vehicle_class_id}),null);
});
test('missing amounts are not represented as zero or replaced with first offence',()=>{
  assert.equal(money(null),'Not specified');
  assert.equal(calculateFine([{...row,subsequent_offence_fine:null}],{jurisdiction:ka,violation:row.violation_id,vehicle:row.vehicle_class_id,repeat:true}).fine_amount,null);
  assert.equal(calculateFine([{...row,subsequent_offence_fine:0}],{jurisdiction:ka,violation:row.violation_id,vehicle:row.vehicle_class_id,repeat:true}).fine_amount,0);
});
test('assistant lookup refuses unrelated topics',()=>{
  assert.equal(rankLaws('What is the fine for no helmet?',[row]).length,1);
  assert.equal(rankLaws('What is the capital of France?',[row]).length,0);
});
test('incompatible legacy export cannot overwrite a valid cache',()=>{
  assert.equal(validateSnapshot({...data,laws:[{id:1,violation_name:'Missing identifiers'}]}),false);
});
