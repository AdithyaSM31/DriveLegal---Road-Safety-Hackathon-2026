package com.drivelegal.app.data

import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

fun currency(value: Double?): String = value?.let { "₹" + NumberFormat.getNumberInstance(Locale.forLanguageTag("en-IN")).apply { maximumFractionDigits = 0 }.format(it) } ?: "Not recorded"
private fun JSONObject.text(key: String): String? = if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
private fun JSONObject.amount(key: String): Double? = if (isNull(key) || !has(key)) null else getDouble(key)
private fun JSONObject.identifier(key: String): Int? = if (isNull(key) || !has(key)) null else getInt(key)
fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }

data class Region(val id: Int, val name: String, val national: Boolean, val effective: String?, val sourceUrl: String?)
data class Law(
    val id: Int, val violationId: Int, val regionId: Int, val region: String,
    val name: String, val section: String, val category: String, val categoryId: Int,
    val vehicleId: Int?, val vehicle: String?, val description: String?, val severity: String?,
    val first: Double?, val repeat: Double?, val maximum: Double?, val compounding: Double?,
    val imprisonment: String?, val licence: String?, val penalties: String?, val notes: String?,
    val source: String?, val sourceUrl: String?, val effective: String?
) {
    val key: String get() = "$region|$section|$name|${vehicle ?: "any"}"
    fun amount(repeated: Boolean) = if (repeated) repeat else first
    companion object {
        fun parse(o: JSONObject) = Law(
            o.getInt("id"), o.getInt("violation_id"), o.getInt("jurisdiction_id"), o.getString("jurisdiction_name"),
            o.getString("violation_name"), o.optString("section_reference"), o.optString("category_name"), o.getInt("category_id"),
            o.identifier("vehicle_class_id"), o.text("vehicle_class"), o.text("description"), o.text("severity"),
            o.amount("first_offence_fine"), o.amount("subsequent_offence_fine"), o.amount("max_fine"), o.amount("compounding_fee"),
            o.text("imprisonment_text"), o.text("license_action"), o.text("additional_penalties"), o.text("notes"),
            o.text("source"), o.text("source_url"), o.text("effective_date")
        )
    }
}
data class Snapshot(val laws: List<Law>, val regions: List<Region>, val syncedAt: String? = null) {
    init { require(laws.isNotEmpty() && regions.isNotEmpty()) { "The dataset is empty." } }
    companion object {
        fun parse(json: String): Snapshot {
            val root = JSONObject(json)
            val laws = root.getJSONArray("laws").objects().map(Law::parse)
            val regions = root.getJSONArray("jurisdictions").objects().map { Region(it.getInt("id"), it.getString("name"), it.optString("type") == "national", it.text("effective_date"), it.text("source_url")) }
            require(laws.all { law -> regions.any { it.id == law.regionId } }) { "Region metadata is incomplete." }
            return Snapshot(laws, regions, root.text("syncedAt"))
        }
    }
}
fun filterLaws(laws: List<Law>, regionId: Int?, query: String = "", category: String? = null, saved: Set<String>? = null): List<Law> {
    val search = query.trim()
    return laws.filter { row -> (regionId == null || row.regionId == regionId) && (category == null || row.category == category) && (saved == null || row.key in saved) && (search.isEmpty() || "${row.name} ${row.section} ${row.description.orEmpty()} ${row.category}".contains(search, ignoreCase = true)) }
}
fun vehicleMatches(row: Law, vehicle: String): Boolean = row.vehicle == null || when (vehicle) {
    "Two-wheeler" -> row.vehicle == "Two-wheeler"
    "Car" -> row.vehicle in listOf("Four-wheeler", "LMV")
    "Heavy" -> row.vehicle == "HMV"
    else -> row.vehicle == vehicle
}
// Generic schedules apply to every vehicle, with an exact vehicle record taking priority.
fun calculatorRows(laws: List<Law>, regionId: Int, vehicle: String): List<Law> = laws.filter { it.regionId == regionId && vehicleMatches(it, vehicle) }.groupBy { it.violationId }.values.map { candidates -> candidates.firstOrNull { it.vehicle != null } ?: candidates.first() }.sortedBy { it.name }
data class Estimate(val rows: List<Law>, val repeated: Boolean) {
    val missingAmounts get() = rows.any { it.amount(repeated) == null }
    val total: Double? get() = if (rows.isEmpty() || missingAmounts) null else rows.sumOf { it.amount(repeated)!! }
}
data class Citation(val source: String, val section: String, val region: String, val url: String?)
data class Answer(val text: String, val citations: List<Citation>, val mode: String)
data class ChatMessage(val id: Long, val text: String, val user: Boolean, val citations: List<Citation> = emptyList(), val mode: String = "")
private val ignored = "what the for fine fines is a in of and my how much without driving riding are can i to me tell with under penalty".split(" ").toSet()
fun relevantLaws(message: String, laws: List<Law>): List<Law> {
    val tokens = Regex("[a-z0-9]+").findAll(message.lowercase()).map { it.value }.filterNot { it in ignored }.toMutableSet()
    mapOf("helmet" to listOf("headgear"), "speed" to listOf("speeding", "overspeed", "fast"), "license" to listOf("licence"), "drunk" to listOf("alcohol", "drink"), "seat" to listOf("seatbelt", "belt"), "phone" to listOf("mobile"), "insurance" to listOf("uninsured"), "pollution" to listOf("puc")).forEach { (key, aliases) -> if (aliases.any { it in tokens }) tokens.add(key) }
    val ranked = laws.map { row -> row to tokens.count { "${row.name} ${row.description.orEmpty()} ${row.section}".contains(it, ignoreCase = true) } }.filter { it.second > 0 }.sortedByDescending { it.second }
    return ranked.filter { it.second == ranked.firstOrNull()?.second }.map { it.first }.distinctBy { it.key }.take(5)
}
fun localAnswer(question: String, snapshot: Snapshot, regionId: Int): Answer {
    val named = snapshot.regions.filter { Regex("\\b${Regex.escape(it.name)}\\b", RegexOption.IGNORE_CASE).containsMatchIn(question) }.maxByOrNull { it.name.length }
    val rows = relevantLaws(question, filterLaws(snapshot.laws, named?.id ?: regionId))
    if (rows.isEmpty()) return Answer("I couldn’t find a matching record for this question in the selected jurisdiction. Coverage is limited. Try a violation name or section, or check the relevant transport authority.", emptyList(), "Offline lookup")
    val text = rows.joinToString("\n\n") { "${it.name}\n${it.region} · §${it.section} · ${it.vehicle ?: "Any vehicle"}\nFirst offence: ${currency(it.first)}\nRepeat offence: ${currency(it.repeat)}\n${it.licence?.let { action -> "Licence: $action\n" }.orEmpty()}Effective: ${it.effective ?: "Not recorded"}" }
    return Answer("From the supplied project records:\n\n$text\n\nCurrent amendments have not been verified. Check the linked source.", rows.map { Citation(it.source ?: "Project dataset", it.section, it.region, it.sourceUrl) }, "Offline lookup")
}
