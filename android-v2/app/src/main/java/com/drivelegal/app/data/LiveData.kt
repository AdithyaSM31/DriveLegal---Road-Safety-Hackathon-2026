package com.drivelegal.app.data

import org.json.JSONObject
import org.json.JSONArray

fun parseOnlineAnswer(response:JSONObject):Answer {
    val mode=response.optString("mode")
    require(mode.isBlank() || mode in listOf("ai","database"))
    val reply=response.getString("reply").trim()
    require(reply.isNotEmpty())
    val citations=(response.optJSONArray("citations") ?: JSONArray()).objects().map {
        Citation(it.optString("source"),it.optString("section"),it.optString("jurisdiction"),if(it.isNull("url"))null else it.optString("url"))
    }
    return Answer(reply,citations,when(mode){"ai"->"AI · retrieved records";"database"->"Database lookup";else->"Online AI · Render"})
}
fun parseMappedLimit(root:JSONObject):Int? {
    val limits=root.getJSONArray("elements").objects().mapNotNull { element ->
        val tag=element.optJSONObject("tags")?.optString("maxspeed") ?: return@mapNotNull null
        val match=Regex("^(\\d+(?:\\.\\d+)?)\\s*(mph|km/h|kph)?$",RegexOption.IGNORE_CASE).matchEntire(tag.trim()) ?: return@mapNotNull null
        kotlin.math.round(match.groupValues[1].toDouble() * if(match.groupValues[2].equals("mph",true))1.609344 else 1.0).toInt().takeIf {it in 1..200}
    }.distinct()
    return limits.singleOrNull()
}

data class SpeedCamera(val id:Long,val latitude:Double,val longitude:Double,val name:String,val distance:Int,val maxspeed:String)
fun parseSpeedCameras(root:JSONObject):List<SpeedCamera> {
    require(!root.has("error")) {"Camera data unavailable"}
    return root.getJSONArray("cameras").objects().mapNotNull {
        val lat=it.optDouble("lat",Double.NaN);val lon=it.optDouble("lon",Double.NaN)
        if(!lat.isFinite() || !lon.isFinite() || lat !in -90.0..90.0 || lon !in -180.0..180.0)null
        else SpeedCamera(it.optLong("id"),lat,lon,it.optString("name","Speed camera"),it.optInt("distance"),it.optString("maxspeed","Unknown"))
    }.distinctBy {it.id}.sortedBy {it.distance}
}

fun parseOverpassCameras(root:JSONObject,lat:Double,lon:Double):List<SpeedCamera> {
    val output=JSONArray()
    root.getJSONArray("elements").objects().forEach {element ->
        val a=element.optDouble("lat",Double.NaN);val b=element.optDouble("lon",Double.NaN)
        if(a.isFinite() && b.isFinite() && a in -90.0..90.0 && b in -180.0..180.0) {
            val deltaLat=Math.toRadians(a-lat);val deltaLon=Math.toRadians(b-lon)
            val h=kotlin.math.sin(deltaLat/2).let {it*it}+kotlin.math.cos(Math.toRadians(lat))*kotlin.math.cos(Math.toRadians(a))*kotlin.math.sin(deltaLon/2).let {it*it}
            val distance=(6371000*2*kotlin.math.asin(kotlin.math.sqrt(h.coerceIn(0.0,1.0)))).toInt()
            val tags=element.optJSONObject("tags") ?: JSONObject()
            output.put(JSONObject().put("id",element.optLong("id")).put("lat",a).put("lon",b).put("distance",distance).put("name",tags.optString("name","Speed camera")).put("maxspeed",tags.optString("maxspeed","Unknown")))
        }
    }
    return parseSpeedCameras(JSONObject().put("cameras",output))
}
