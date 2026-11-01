package com.drivelegal.app
import com.drivelegal.app.data.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
class LiveDataTest {
    @Test fun oldRenderReplyIsAcceptedAsOnline() {val answer=parseOnlineAnswer(JSONObject("""{"reply":"Helmet answer","citations":[],"session_id":"x"}"""));assertEquals("Online AI · Render",answer.mode);assertEquals("Helmet answer",answer.text)}
    @Test fun newDatabaseReplyKeepsItsMode() {assertEquals("Database lookup",parseOnlineAnswer(JSONObject("""{"reply":"Record","mode":"database"}""")).mode)}
    @Test fun mappedMilesAreConverted() {assertEquals(48,parseMappedLimit(JSONObject("""{"elements":[{"tags":{"maxspeed":"30 mph"}}]}""")))}
    @Test fun conflictingRoadsDoNotInventALimit() {assertNull(parseMappedLimit(JSONObject("""{"elements":[{"tags":{"maxspeed":"30"}},{"tags":{"maxspeed":"60"}}]}""")))}
    @Test fun noMapCoverageDoesNotBecomeDefaultLimit() {assertNull(parseMappedLimit(JSONObject("""{"elements":[]}""")))}
    @Test fun stationaryFixIsZeroRatherThanMissing() {assertEquals(0,DriveState(active=true,speed=0).speed)}
    @Test fun cameraCoordinatesAreValidatedAndSorted() {
        val cameras=parseSpeedCameras(JSONObject("""{"cameras":[{"id":2,"lat":9.9,"lon":76.3,"distance":200},{"id":3,"lat":91,"lon":76},{"id":1,"lat":10,"lon":76,"distance":50}]}"""))
        assertEquals(listOf(1L,2L),cameras.map {it.id})
    }
    @Test(expected=IllegalArgumentException::class) fun cameraFailureIsNotAnEmptyCoverageResult() {parseSpeedCameras(JSONObject("""{"error":"unavailable","cameras":[]}"""))}
    @Test fun directCameraFallbackKeepsCoordinatesAndTags() {
        val cameras=parseOverpassCameras(JSONObject("""{"elements":[{"id":7,"lat":9.98,"lon":76.28,"tags":{"name":"Test camera","maxspeed":"40"}}]}"""),9.98,76.28)
        assertEquals(1,cameras.size);assertEquals(0,cameras[0].distance);assertEquals("40",cameras[0].maxspeed)
    }
}
