package com.drivelegal.app

import com.drivelegal.app.data.*
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class DomainTest {
    private fun snapshot()=Snapshot.parse(File("src/main/assets/snapshot.json").readText())
    @Test fun offlineSnapshotHasAllSchedulesAndMetadata(){val s=snapshot();assertEquals(31,s.laws.size);assertEquals(13,s.regions.size);assertTrue(s.laws.all {it.sourceUrl!=null})}
    @Test fun regionAndSearchNeverMixStateAmounts(){val s=snapshot();val ka=s.regions.first {it.name=="Karnataka"};val rows=filterLaws(s.laws,ka.id,"194D");assertEquals(1,rows.size);assertEquals(500.0,rows.first().first!!,0.01)}
    @Test fun generalVehicleSchedulesAreAvailableInCalculator(){val s=snapshot();val mh=s.regions.first {it.name=="Maharashtra"};val rows=calculatorRows(s.laws,mh.id,"Two-wheeler");assertTrue(rows.any {it.section=="181"});assertTrue(rows.any {it.section=="185"});assertFalse(rows.any {it.vehicle=="LMV"})}
    @Test fun vehicleSpecificSchedulesAreNotDuplicated(){val s=snapshot();val mh=s.regions.first {it.name=="Maharashtra"};val rows=calculatorRows(s.laws,mh.id,"Car");assertEquals(rows.map {it.violationId}.distinct().size,rows.size);assertEquals(1,rows.count {it.section=="194B"})}
    @Test fun repeatAmountsRemainDistinct(){val row=snapshot().laws.first {it.region=="Karnataka"};assertEquals(500.0,Estimate(listOf(row),false).total!!,0.01);assertEquals(1000.0,Estimate(listOf(row),true).total!!,0.01)}
    @Test fun unknownFinePreventsFalseZeroTotal(){val row=snapshot().laws.first().copy(repeat=null);assertNull(Estimate(listOf(row),true).total);assertEquals("Not recorded",currency(null));assertNull(Estimate(emptyList(),false).total)}
    @Test fun savedKeysSurviveDatabaseRowIdChanges(){val row=snapshot().laws.first();assertEquals(row.key,row.copy(id=999).key)}
    @Test fun assistantProvidesRecordsAndSourcesOffline(){val s=snapshot();val ka=s.regions.first {it.name=="Karnataka"};val answer=localAnswer("helmet",s,ka.id);assertTrue(answer.citations.isNotEmpty());assertTrue(answer.text.contains("500"));assertEquals("Karnataka",answer.citations.first().region)}
    @Test fun namedRegionOverridesCurrentState(){val s=snapshot();val ka=s.regions.first {it.name=="Karnataka"};assertEquals("Kerala",localAnswer("helmet in Kerala",s,ka.id).citations.first().region)}
    @Test fun assistantDoesNotInventAbsentLaw(){val s=snapshot();val ka=s.regions.first {it.name=="Karnataka"};assertTrue(localAnswer("insurance",s,ka.id).citations.isEmpty())}
    @Test fun speedStatusNeverClaimsUnknownLimit(){assertEquals("Follow posted road signs",DriveState(active=true,speed=34).label);assertFalse(DriveState(active=true,speed=34).over)}
    @Test fun overspeedUsesExplicitEnteredLimit(){val d=DriveState(active=true,speed=34,postedLimit=30);assertTrue(d.over);assertEquals("Slow down — 4 km/h over",d.label)}
    @Test fun simulationIsAlwaysMarked(){assertEquals("Simulation · not live GPS",DriveState(simulated=true,speed=34).label)}
}
