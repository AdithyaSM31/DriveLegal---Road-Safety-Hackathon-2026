package com.drivelegal.app

import android.Manifest
import android.app.Application
import android.app.Activity
import androidx.credentials.exceptions.GetCredentialCancellationException
import kotlinx.coroutines.CancellationException
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.drivelegal.app.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

enum class Tab { Home, Laws, Drive, Fines, Assistant }
data class AppState(
    val snapshot: Snapshot? = null, val error: String? = null, val tab: Tab = Tab.Home,
    val regionId: Int = 0, val query: String = "", val category: String? = null,
    val savedOnly: Boolean = false, val bookmarks: Set<String> = emptySet(),
    val vehicle: String = "Two-wheeler", val selected: Set<String> = emptySet(), val repeated: Boolean = false,
    val messages: List<ChatMessage> = emptyList(), val sending: Boolean = false, val syncing: Boolean = false,
    val name: String = "", val backend: String = "", val lowPower: Boolean = true,
    val darkMode:Boolean=false, val guestMode:Boolean=false, val account:Account?=null, val authBusy:Boolean=false, val authError:String?=null,
    val autoRegion:Boolean=true, val locationRegion:String?=null, val checkingBackend:Boolean=false, val backendStatus:String?=null,
    val mapOpen:Boolean=false, val mapCameras:List<SpeedCamera> = emptyList(), val mapLoading:Boolean=false, val mapError:String?=null, val mapUpdated:Long=0L,
    val notice: String? = null, val weather: String? = null, val cameras: String? = null, val contextBusy: Boolean = false
)
data class DriveState(
    val active: Boolean = false, val simulated: Boolean = false, val speed: Int? = null,
    val postedLimit: Int? = null, val automaticLimit: Boolean = false, val accuracy: Int? = null, val latitude: Double? = null, val longitude: Double? = null,
    val status: String = "Ready when you are", val lastFix: Long = 0L
) {
    val over: Boolean get() = speed != null && postedLimit != null && speed > postedLimit
    val label: String get() = when { over -> "Slow down — ${speed!! - postedLimit!!} km/h over"; simulated -> "Simulation · not live GPS"; !active -> "Drive not started"; speed == null -> "Waiting for reliable speed"; postedLimit == null -> "Follow posted road signs"; automaticLimit -> "Within mapped limit · check road signs"; else -> "Within your entered limit" }
}
class DriveLegalApplication : Application()
class MainViewModel(application: Application) : AndroidViewModel(application) {
    val repository = LawRepository(application)
    val authentication=AuthRepository(application)
    private val _ui = MutableStateFlow(AppState(name=repository.name, bookmarks=repository.bookmarks, backend=repository.backend, lowPower=repository.lowPower,autoRegion=true,darkMode=repository.darkMode,guestMode=repository.guestMode,account=authentication.account.value))
    val ui = _ui.asStateFlow()
    private val _drive = MutableStateFlow(DriveState())
    val drive = _drive.asStateFlow()
    private val manager = application.getSystemService(LocationManager::class.java)
    private var foreground = false
    private var listening = false
    private var expiry: Job? = null
    private var chatJob: Job? = null
    private var messageId = 0L
    private var lastWeatherRequest=0L
    private var lastLimitRequest=0L
    private var lastLimitLocation:Location?=null
    private var contextJob:Job?=null
    private var manualLimit=false
    private var lastRegionRequest=0L
    private var regionJob:Job?=null
    private var cameraJob:Job?=null
    private var cameraLocation:Location?=null
    private var lastCameraRequest=0L
    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            val ageMs = (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000
            if (ageMs > 10_000) return
            val reliable = location.hasSpeed() && location.accuracy <= 40 && (!location.hasSpeedAccuracy() || location.speedAccuracyMetersPerSecond <= 5)
            _drive.update { it.copy(speed=if(reliable) (location.speed * 3.6).roundToInt().coerceAtLeast(0) else null, latitude=location.latitude, longitude=location.longitude, accuracy=location.accuracy.roundToInt(), status=if(reliable) "GPS fix · ±${location.accuracy.roundToInt()} m" else "Location available; reliable speed unavailable", lastFix=SystemClock.elapsedRealtime()) }
            automaticContext(location)
            detectRegion(location)
            if(_ui.value.mapOpen)loadMapCameras()
        }
        override fun onProviderDisabled(provider: String) { _drive.update { it.copy(speed=null,status="Location provider disabled") } }
    }
    init { viewModelScope.launch { runCatching { repository.load() }.onSuccess { snapshot -> _ui.update { it.copy(snapshot=snapshot,regionId=snapshot.regions.find { r -> r.name==repository.regionName }?.id ?: snapshot.regions.first().id) } }.onFailure { error -> _ui.update { it.copy(error=error.message ?: "Library unavailable") } } } }
    init { viewModelScope.launch { authentication.account.collect { account -> _ui.update { it.copy(account=account,authError=null) } } } }
    fun darkMode(value:Boolean) {repository.darkMode=value;_ui.update {it.copy(darkMode=value)}}
    fun browseOffline() {repository.guestMode=true;_ui.update {it.copy(guestMode=true,authError=null)}}
    fun clearAuthError() {_ui.update {it.copy(authError=null)}}
    fun google(activity:Activity) = authenticate {authentication.google(activity)}
    fun email(email:String,password:String,create:Boolean=false) = authenticate {authentication.email(email,password,create)}
    fun resetPassword(email:String) = authenticate {authentication.reset(email);notice("Password reset requested. Check your email.")}
    private fun authenticate(action:suspend ()->Unit) {
        if(_ui.value.authBusy)return
        _ui.update {it.copy(authBusy=true,authError=null)}
        viewModelScope.launch {
            try {action()}
            catch(_:GetCredentialCancellationException) { /* User dismissed account selection. */ }
            catch(error:CancellationException) {throw error}
            catch(error:Exception) {_ui.update {it.copy(authError=error.localizedMessage ?: "Sign-in could not finish. Check your connection and try again.")}}
            finally {_ui.update {it.copy(authBusy=false)}}
        }
    }
    fun signOut() {endDrive();newChat();viewModelScope.launch {authentication.signOut();repository.guestMode=false;_ui.update {it.copy(guestMode=false,tab=Tab.Home,messages=emptyList(),authError=null)}}}
    fun checkBackend() {
        if(_ui.value.checkingBackend)return
        _ui.update {it.copy(checkingBackend=true,backendStatus=null)}
        viewModelScope.launch {
            val result=runCatching {repository.connectionStatus()}.getOrElse {"Not reachable right now. Offline tools remain available."}
            _ui.update {it.copy(checkingBackend=false,backendStatus=result)}
        }
    }
    fun navigate(tab: Tab) { if (tab != Tab.Drive) endDrive(); _ui.update { it.copy(tab=tab) }; if(tab in listOf(Tab.Laws,Tab.Fines,Tab.Assistant))defaultLocationRegion(); startSensors() }
    fun region(id: Int) { repository.autoRegion=false; _ui.update {it.copy(autoRegion=false)}; val name = _ui.value.snapshot?.regions?.find { it.id==id }?.name ?: return; repository.regionName=name; _ui.update { it.copy(regionId=id,selected=emptySet(),category=null) } }
    fun query(value: String) { _ui.update { it.copy(query=value) } }
    fun category(value: String?) { _ui.update { it.copy(category=value) } }
    fun savedOnly(value: Boolean) { _ui.update { it.copy(savedOnly=value) } }
    fun bookmark(law: Law) { val next = if(law.key in _ui.value.bookmarks) _ui.value.bookmarks-law.key else _ui.value.bookmarks+law.key; repository.bookmarks=next; _ui.update { it.copy(bookmarks=next) } }
    fun vehicle(value: String) { _ui.update { it.copy(vehicle=value,selected=emptySet()) } }
    fun repeat(value: Boolean) { _ui.update { it.copy(repeated=value) } }
    fun select(law: Law) { _ui.update { it.copy(selected=if(law.key in it.selected) it.selected-law.key else it.selected+law.key) } }
    fun estimateLaw(law: Law) { region(law.regionId); val vehicle=when(law.vehicle){"Two-wheeler"->"Two-wheeler";"HMV"->"Heavy";else->"Car"}; _ui.update { it.copy(vehicle=vehicle,selected=setOf(law.key),tab=Tab.Fines) } }
    fun notice(text: String?) { _ui.update { it.copy(notice=text) } }
    fun settings(name: String, backend: String, lowPower: Boolean): Boolean = runCatching {
        repository.backend=backend; repository.name=name; repository.lowPower=lowPower
        _ui.update { it.copy(name=repository.name,backend=repository.backend,lowPower=lowPower,backendStatus=null) }; true
    }.getOrElse { notice(it.message); false }
    fun sync() {
        if(_ui.value.syncing) return
        _ui.update { it.copy(syncing=true) }
        viewModelScope.launch {
            runCatching { repository.sync() }.onSuccess { snapshot -> _ui.update { it.copy(snapshot=snapshot,regionId=snapshot.regions.find { r->r.name==repository.regionName }?.id ?: snapshot.regions.first().id,selected=emptySet(),notice="Offline library updated.") } }.onFailure { notice("Sync unavailable. Keeping your offline library. ${it.message.orEmpty()}") }
            _ui.update { it.copy(syncing=false) }
        }
    }
    fun newChat() { chatJob?.cancel(); _ui.update { it.copy(messages=emptyList(),sending=false) } }
    fun ask(text: String) {
        val question=text.trim().take(2000); val current=_ui.value; val snapshot=current.snapshot ?: return
        if(question.isBlank() || current.sending) return
        _ui.update { it.copy(messages=it.messages+ChatMessage(++messageId,question,true),sending=true) }
        chatJob=viewModelScope.launch {
            try { val answer=repository.ask(question,snapshot,current.regionId,if(current.autoRegion)current.locationRegion else null); _ui.update { it.copy(messages=it.messages+ChatMessage(++messageId,answer.text,false,answer.citations,answer.mode)) } }
            finally { _ui.update { it.copy(sending=false) } }
        }
    }
    fun simulated(value: Boolean) { stopSensors(); _drive.update { it.copy(simulated=value,speed=if(value) 0 else null,status=if(value) "Demo speed controlled by slider" else "Ready when you are",latitude=null,longitude=null,accuracy=null) } }
    fun simulatedSpeed(value: Int) { if(_drive.value.simulated) _drive.update { it.copy(speed=value) } }
    fun limit(value: Int?) { manualLimit=value!=null;if(value==null)lastLimitRequest=0L; _drive.update { it.copy(postedLimit=value,automaticLimit=false) } }
    fun startDrive() { _drive.update { it.copy(active=true) }; _ui.update { it.copy(tab=Tab.Drive) }; startSensors() }
    fun endDrive() { stopSensors(); _drive.update { it.copy(active=false,speed=if(it.simulated) it.speed else null) } }
    fun appForeground(value: Boolean) { foreground=value; if(value)startSensors() else {stopSensors();contextJob?.cancel();cameraJob?.cancel();regionJob?.cancel()} }
    private fun startSensors() {
        val d=_drive.value
        if(!foreground || (_ui.value.account==null && !_ui.value.guestMode) || d.simulated || listening) return
        val fine=ContextCompat.checkSelfPermission(getApplication(),Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED
        val coarse=ContextCompat.checkSelfPermission(getApplication(),Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
        if(!fine && !coarse) { _drive.update { it.copy(status="Location permission needed",speed=null) }; return }
        val provider=when { fine && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)->LocationManager.GPS_PROVIDER; manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)->LocationManager.NETWORK_PROVIDER; else->null }
        if(provider==null) { _drive.update { it.copy(status="Enable device location to get speed",speed=null) }; return }
        try {
            manager.requestLocationUpdates(provider,if(_ui.value.lowPower) 5000L else 2000L,0f,listener,Looper.getMainLooper())
            listening=true
            _drive.update { it.copy(status="Acquiring GPS…",speed=null) }
            expiry=viewModelScope.launch { while(true) { delay(5000); if(SystemClock.elapsedRealtime()-_drive.value.lastFix>15000) _drive.update { it.copy(speed=null,status="Waiting for a fresh location fix") } } }
        } catch(_: SecurityException) { _drive.update { it.copy(status="Location permission unavailable",speed=null) } }
    }
    private fun stopSensors() { if(listening)manager.removeUpdates(listener);listening=false;expiry?.cancel();expiry=null;if(!_drive.value.simulated)_drive.update { it.copy(speed=null) } }
    fun refreshContext(cameras: Boolean = false) {
        val d=_drive.value; if(d.simulated || d.latitude==null || d.longitude==null || SystemClock.elapsedRealtime()-d.lastFix>120000) { notice("Start a GPS drive to obtain a location first. Simulation never sends coordinates.");return }
        if(_ui.value.contextBusy) return
        _ui.update { it.copy(contextBusy=true) }
        viewModelScope.launch {
            runCatching { if(cameras)repository.cameras(d.latitude,d.longitude) else repository.weather(d.latitude,d.longitude) }.onSuccess { result -> _ui.update { if(cameras)it.copy(cameras=result) else it.copy(weather=result) } }.onFailure { notice("Road context unavailable. ${it.message.orEmpty()}") }
            _ui.update { it.copy(contextBusy=false) }
        }
    }
    private fun defaultLocationRegion() {
        repository.autoRegion=true
        val state=_ui.value.locationRegion
        if(state==null){_ui.update {it.copy(autoRegion=true)};automaticRegion();return}
        val snapshot=_ui.value.snapshot
        val region=snapshot?.regions?.find {it.name.equals(state,true)} ?: snapshot?.regions?.find {it.national}
        if(region!=null)repository.regionName=region.name
        _ui.update {it.copy(autoRegion=true,regionId=region?.id ?: it.regionId,selected=if(region?.id!=it.regionId)emptySet() else it.selected)}
        if(state==null)automaticRegion()
    }
    fun mapOpen(value:Boolean) { _ui.update {it.copy(mapOpen=value)};if(value){startSensors();loadMapCameras()}else{cameraJob?.cancel();_ui.update {it.copy(mapLoading=false)}} }
    fun loadMapCameras(force:Boolean=false) {
        val d=_drive.value
        if(d.simulated || d.latitude==null || d.longitude==null || SystemClock.elapsedRealtime()-d.lastFix>15000)return
        if(cameraJob?.isActive==true)return
        val location=Location("camera").apply {latitude=d.latitude;longitude=d.longitude}
        val now=SystemClock.elapsedRealtime()
        if(!force && lastCameraRequest!=0L && now-lastCameraRequest<120000 && !(now-lastCameraRequest>=30000 && (cameraLocation?.distanceTo(location) ?: 0f)>500))return
        lastCameraRequest=now;cameraLocation=location
        _ui.update {it.copy(mapLoading=true,mapError=null)}
        cameraJob=viewModelScope.launch {
            try {
                val cameras=repository.mappedCameras(d.latitude,d.longitude)
                _ui.update {it.copy(mapCameras=cameras,mapUpdated=System.currentTimeMillis())}
            }catch(error:CancellationException){throw error}
            catch(_:Exception){_ui.update {it.copy(mapError="Camera lookup unavailable. Try again.")}}
            finally{_ui.update {it.copy(mapLoading=false)}}
        }
    }
    fun automaticRegion() { repository.autoRegion=true; _ui.update {it.copy(autoRegion=true)};lastRegionRequest=0L
        val d=_drive.value
        if(d.latitude!=null && d.longitude!=null) detectRegion(Location("current").apply {latitude=d.latitude;longitude=d.longitude})
    }
    @Suppress("DEPRECATION")
    private fun detectRegion(location:Location) {
        if(!_ui.value.autoRegion || regionJob?.isActive==true)return
        val now=SystemClock.elapsedRealtime()
        if(lastRegionRequest!=0L && now-lastRegionRequest<120000)return
        lastRegionRequest=now
        regionJob=viewModelScope.launch {
            val address=kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                runCatching {android.location.Geocoder(getApplication(),java.util.Locale.ENGLISH).getFromLocation(location.latitude,location.longitude,1)?.firstOrNull()}.getOrNull()
            } ?: return@launch
            if(!_ui.value.autoRegion)return@launch
            val state=address.adminArea ?: return@launch
            val snapshot=_ui.value.snapshot ?: return@launch
            val region=if(address.countryCode.equals("IN",true)) snapshot.regions.find {it.name.equals(state,true)} else null
            val previousState=_ui.value.locationRegion
            _ui.update {it.copy(locationRegion=state)}
            if(region!=null && region.id!=_ui.value.regionId) {repository.regionName=region.name;_ui.update {it.copy(regionId=region.id,selected=emptySet(),category=null)}}
            else {val national=snapshot.regions.find {it.national};if(national!=null && (national.id!=_ui.value.regionId || previousState!=state))_ui.update {it.copy(regionId=national.id,selected=emptySet(),notice="Detected $state. State records unavailable; showing the national baseline.")}}
        }
    }
    private fun automaticContext(location:Location) {
        if(_drive.value.simulated || !foreground || contextJob?.isActive==true)return
        val now=SystemClock.elapsedRealtime()
        val weatherDue=lastWeatherRequest==0L || now-lastWeatherRequest>=600000 || (_ui.value.weather==null && now-lastWeatherRequest>=60000)
        val limitDue=lastLimitRequest==0L || now-lastLimitRequest>=60000 || (now-lastLimitRequest>=20000 && (lastLimitLocation?.distanceTo(location) ?: 0f)>100)
        if(!weatherDue && !limitDue)return
        contextJob=viewModelScope.launch {
            if(weatherDue) {lastWeatherRequest=now;runCatching {repository.weather(location.latitude,location.longitude)}.onSuccess {weather->_ui.update {it.copy(weather=weather)}}}
            if(limitDue) {lastLimitRequest=now;lastLimitLocation=Location(location)
                val limit=runCatching {repository.speedLimit(location.latitude,location.longitude)}.getOrNull()
                if(!manualLimit && !_drive.value.simulated)_drive.update {it.copy(postedLimit=limit,automaticLimit=limit!=null)}
            }
        }
    }
    override fun onCleared() { authentication.close(); stopSensors(); super.onCleared() }
}
