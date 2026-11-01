package com.drivelegal.app.data

import android.content.Context
import android.util.AtomicFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

class LawRepository(private val context: Context) {
    private val cache = AtomicFile(File(context.filesDir, "law-library.json"))
    private val prefs = context.getSharedPreferences("drivelegal-v2", Context.MODE_PRIVATE)
    var backend: String
        get() = prefs.getString("backend", "https://drivelegal-road-safety-hackathon-2026.onrender.com")!!
        set(value) {
            val url = URL(value.trim().trimEnd('/'))
            require(url.protocol == "https" && url.userInfo == null && url.query == null && url.ref == null) { "Use an HTTPS backend URL without credentials, query, or fragment." }
            prefs.edit().putString("backend", url.toString().trimEnd('/')).apply()
        }
    var regionName: String
        get() = prefs.getString("region", "India")!!
        set(value) { prefs.edit().putString("region", value).apply() }
    var bookmarks: Set<String>
        get() = prefs.getStringSet("bookmarks", emptySet())!!.toSet()
        set(value) { prefs.edit().putStringSet("bookmarks", value.toSet()).apply() }
    var name: String
        get() = prefs.getString("name", "")!!
        set(value) { prefs.edit().putString("name", value.trim().take(60)).apply() }
    var lowPower: Boolean
        get() = prefs.getBoolean("lowPower", true)
        set(value) { prefs.edit().putBoolean("lowPower", value).apply() }

    var darkMode: Boolean
        get() = prefs.getBoolean("darkMode", false)
        set(value) { prefs.edit().putBoolean("darkMode", value).apply() }
    var autoRegion:Boolean
        get()=prefs.getBoolean("autoRegion",true)
        set(value){prefs.edit().putBoolean("autoRegion",value).apply()}
    var guestMode: Boolean
        get() = prefs.getBoolean("guestMode", false)
        set(value) { prefs.edit().putBoolean("guestMode", value).apply() }
    suspend fun connectionStatus(): String = withContext(Dispatchers.IO) {
        val health = JSONObject(http("$backend/api/health"))
        check(health.optString("status") == "ok") { "The health endpoint did not report a healthy server." }
        val laws = JSONArray(http("$backend/api/laws/export/all"))
        val compatible = laws.length() > 0 && laws.getJSONObject(0).let { it.has("violation_id") && it.has("jurisdiction_id") && it.has("category_id") }
        if (compatible) "Connected · compatible law export · backend ${health.optString("version", "unknown version")}" else "Server reachable · older law export; deploy the updated backend to enable sync."
    }
    suspend fun load(): Snapshot = withContext(Dispatchers.IO) {
        runCatching { Snapshot.parse(cache.openRead().bufferedReader().use { it.readText() }) }
            .getOrElse { Snapshot.parse(context.assets.open("snapshot.json").bufferedReader().use { it.readText() }) }
    }
    private fun http(url: String, body: JSONObject? = null): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 12000
        connection.readTimeout = if(body!=null)60000 else 18000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("User-Agent", "DriveLegal/2.0.4 (Android; com.drivelegal.app)")
        try {
            if (body != null) {
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            check(connection.responseCode in 200..299) { "Server returned ${connection.responseCode}. Your offline library is still available." }
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally { connection.disconnect() }
    }
    suspend fun sync(): Snapshot = withContext(Dispatchers.IO) {
        val base = backend
        val root = coroutineScope {
            val laws = async { JSONArray(http("$base/api/laws/export/all")) }
            val regions = async { JSONArray(http("$base/api/locations")) }
            JSONObject().put("version", 1).put("laws", laws.await()).put("jurisdictions", regions.await()).put("syncedAt", Instant.now().toString())
        }
        val text = root.toString()
        val snapshot = runCatching { Snapshot.parse(text) }.getOrElse { throw IllegalStateException("The backend export needs the v2 update. Your offline library has been kept.", it) } // Validate before replacing working data.
        val stream = cache.startWrite()
        try { stream.write(text.toByteArray(Charsets.UTF_8)); cache.finishWrite(stream) }
        catch (error: Exception) { cache.failWrite(stream); throw error }
        snapshot
    }
    suspend fun ask(question: String, snapshot: Snapshot, regionId: Int, detectedState:String?=null): Answer = withContext(Dispatchers.IO) {
        runCatching {
            val response = JSONObject(http("$backend/api/chat/", JSONObject().put("message", "${question.take(1800)}\nJurisdiction: ${detectedState ?: snapshot.regions.find { it.id == regionId }?.name ?: "India"}.").put("jurisdiction_id", regionId)))
            parseOnlineAnswer(response)
        }.getOrElse { localAnswer(question, snapshot, regionId).let { answer -> answer.copy(mode="Offline fallback · server unavailable") } }
    }
    suspend fun weather(lat: Double, lon: Double): String = withContext(Dispatchers.IO) {
        val root = JSONObject(http("https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,weather_code"))
        val current = root.getJSONObject("current")
        val label = when (current.getInt("weather_code")) { 0 -> "Clear"; in 1..3 -> "Cloudy"; 45,48 -> "Fog"; in 51..67 -> "Rain"; in 71..77 -> "Snow"; in 80..86 -> "Showers"; else -> "Storms" }
        "$label · ${current.getDouble("temperature_2m").toInt()}°C\n${current.getString("time").replace('T', ' ')} GMT · Open-Meteo"
    }
    suspend fun speedLimit(lat: Double, lon: Double): Int? = withContext(Dispatchers.IO) {
        // Fetch actual map tags; never substitute a default limit when coverage is absent.
        val query="[out:json][timeout:10];way(around:25,$lat,$lon)[highway][maxspeed];out tags;"
        val root=JSONObject(http("https://overpass-api.de/api/interpreter?data="+java.net.URLEncoder.encode(query,"UTF-8")))
        parseMappedLimit(root)
    }
    suspend fun mappedCameras(lat:Double,lon:Double):List<SpeedCamera> = withContext(Dispatchers.IO) {
        try {parseSpeedCameras(JSONObject(http("$backend/api/locations/speed-cameras?lat=$lat&lon=$lon&radius=3000")))}
        catch(error:kotlinx.coroutines.CancellationException){throw error}
        catch(_:Exception) {
            // Older Render deployments can have outbound networking disabled.
            val query="[out:json][timeout:10];node(around:3000,$lat,$lon)[highway=speed_camera];out tags;"
            val data=try {JSONObject(http("https://overpass-api.de/api/interpreter?data="+java.net.URLEncoder.encode(query,"UTF-8")))} catch(_:Exception) {JSONObject(http("https://overpass.private.coffee/api/interpreter?data="+java.net.URLEncoder.encode(query,"UTF-8")))}
            parseOverpassCameras(data,lat,lon)
        }
    }
    suspend fun cameras(lat: Double, lon: Double): String = withContext(Dispatchers.IO) {
        val root = JSONObject(http("$backend/api/locations/speed-cameras?lat=$lat&lon=$lon&radius=3000"))
        check(!root.has("error")) { "Camera data unavailable." }
        val cameras = root.getJSONArray("cameras")
        if (cameras.length() == 0) "No mapped cameras returned within 3 km. This does not mean the road is camera-free."
        else "${cameras.length()} mapped camera(s) within 3 km. Nearest: ${cameras.getJSONObject(0).optInt("distance")} m. Map coverage may be incomplete."
    }
}
