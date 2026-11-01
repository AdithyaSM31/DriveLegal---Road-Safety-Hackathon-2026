package com.drivelegal.app.ui

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.drivelegal.app.MainViewModel
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.module.http.HttpRequestUtil
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.PropertyFactory.*
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point
import okhttp3.Cache
import okhttp3.OkHttpClient
import java.io.File

private object MapNetwork {
    private var initialized=false
    @Synchronized fun initialize(context:android.content.Context) {
        if(initialized)return
        MapLibre.getInstance(context.applicationContext)
        HttpRequestUtil.setOkHttpClient(OkHttpClient.Builder()
            .cache(Cache(File(context.cacheDir,"map-http"),64L*1024*1024))
            .addInterceptor {chain -> chain.proceed(chain.request().newBuilder().header("User-Agent","DriveLegal/2.0.4 (Android; com.drivelegal.app)").build())}.build())
        initialized=true
    }
}
private val roadStyle="""{
  "version":8,"sources":{"osm":{"type":"raster","tiles":["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],"tileSize":256,"minzoom":0,"maxzoom":19,"attribution":"© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"}},
  "layers":[{"id":"background","type":"background","paint":{"background-color":"#F3F1E9"}},{"id":"roads","type":"raster","source":"osm"}]
}"""
private fun markerBitmap(camera:Boolean,density:Float):Bitmap {
    val side=(36*density).toInt().coerceAtLeast(36)
    val bitmap=Bitmap.createBitmap(side,side,Bitmap.Config.ARGB_8888)
    val canvas=Canvas(bitmap);val p=Paint(Paint.ANTI_ALIAS_FLAG);val c=side/2f
    p.color=android.graphics.Color.WHITE;canvas.drawCircle(c,c,c*.96f,p)
    p.color=if(camera)0xFFFFB800.toInt() else 0xFF1976F3.toInt();canvas.drawCircle(c,c,c*.8f,p)
    if(camera) {
        p.color=0xFF101212.toInt();canvas.drawRoundRect(c*.43f,c*.66f,c*1.57f,c*1.38f,c*.12f,c*.12f,p)
        canvas.drawRect(c*.63f,c*.48f,c*1.06f,c*.72f,p)
        p.color=0xFFFFB800.toInt();canvas.drawCircle(c,c*1.02f,c*.22f,p)
    }
    return bitmap
}
@Suppress("DEPRECATION")
@Composable fun RoadMapDialog(vm:MainViewModel,onDismiss:()->Unit,onPermission:()->Unit) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val drive by vm.drive.collectAsStateWithLifecycle()
    val context=LocalContext.current
    val lifecycle=LocalLifecycleOwner.current.lifecycle
    var map by remember {mutableStateOf<MapLibreMap?>(null)}
    var follow by remember {mutableStateOf(true)}
    var cameraDetails by remember {mutableStateOf<Feature?>(null)}
    var ready by remember {mutableStateOf(false)}
    var tilesReady by remember {mutableStateOf(false)}
    var slowTiles by remember {mutableStateOf(false)}
    var renderingError by remember {mutableStateOf(false)}
    val mapView=remember {
        MapNetwork.initialize(context)
        MapView(context).apply {onCreate(null)}
    }
    DisposableEffect(mapView,lifecycle) {
        var started=false;var resumed=false
        fun start(){if(!started){mapView.onStart();started=true}}
        fun resume(){start();if(!resumed){mapView.onResume();resumed=true}}
        fun pause(){if(resumed){mapView.onPause();resumed=false}}
        fun stop(){pause();if(started){mapView.onStop();started=false}}
        if(lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED))resume()
        else if(lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED))start()
        val observer=LifecycleEventObserver {_,event->when(event){
            Lifecycle.Event.ON_START->start();Lifecycle.Event.ON_RESUME->resume()
            Lifecycle.Event.ON_PAUSE->pause();Lifecycle.Event.ON_STOP->stop();else->Unit
        }}
        lifecycle.addObserver(observer)
        onDispose {lifecycle.removeObserver(observer);stop();mapView.onDestroy()}
    }
    LaunchedEffect(tilesReady) {if(!tilesReady){kotlinx.coroutines.delay(20000);slowTiles=true}}
    LaunchedEffect(mapView) {
        mapView.addOnDidFinishLoadingMapListener {tilesReady=true}
        mapView.addOnDidFailLoadingMapListener {renderingError=true}
        mapView.getMapAsync {native ->
            native.uiSettings.isAttributionEnabled=true
            native.setMaxZoomPreference(19.0)
            native.prefetchZoomDelta=0
            native.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(20.6,78.9),4.0))
            native.setStyle(Style.Builder().fromJson(roadStyle)) {style ->
                style.addSource(GeoJsonSource("live-fix",FeatureCollection.fromFeatures(emptyArray<Feature>())))
                style.addImage("camera-icon",markerBitmap(true,context.resources.displayMetrics.density))
                style.addSource(GeoJsonSource("speed-cameras",FeatureCollection.fromFeatures(emptyArray<Feature>())))
                style.addLayer(SymbolLayer("speed-camera-icons","speed-cameras").withProperties(iconImage("camera-icon"),iconAllowOverlap(true),iconIgnorePlacement(true)))
                style.addLayer(CircleLayer("live-dot","live-fix").withProperties(circleColor("#1976F3"),circleRadius(8f),circleStrokeColor("#FFFFFF"),circleStrokeWidth(3f)))
                map=native;ready=true
            }
            native.addOnMapClickListener {point ->
                val features=native.queryRenderedFeatures(native.projection.toScreenLocation(point),"speed-camera-icons")
                cameraDetails=features.firstOrNull()
                features.isNotEmpty()
            }
            native.addOnCameraMoveStartedListener {reason -> if(reason==MapLibreMap.OnCameraMoveStartedListener.REASON_API_GESTURE)follow=false}
        }
    }
    LaunchedEffect(map,ready,drive.latitude,drive.longitude,drive.lastFix,ui.mapCameras,follow) {
        val native=map ?: return@LaunchedEffect
        if(!ready)return@LaunchedEffect
        val features=ui.mapCameras.map {camera ->Feature.fromGeometry(Point.fromLngLat(camera.longitude,camera.latitude)).apply {
            addStringProperty("name",camera.name);addStringProperty("limit",camera.maxspeed);addNumberProperty("distance",camera.distance)
        }}
        native.style?.getSourceAs<GeoJsonSource>("speed-cameras")?.setGeoJson(FeatureCollection.fromFeatures(features))
        if(!drive.simulated && drive.latitude!=null && drive.longitude!=null) {
            val location=LatLng(drive.latitude!!,drive.longitude!!)
            native.style?.getSourceAs<GeoJsonSource>("live-fix")?.setGeoJson(Feature.fromGeometry(Point.fromLngLat(drive.longitude!!,drive.latitude!!)))
            if(follow)native.moveCamera(CameraUpdateFactory.newLatLngZoom(location,native.cameraPosition.zoom.coerceAtLeast(15.0)))
        }
    }
    cameraDetails?.let {camera ->AlertDialog(onDismissRequest={cameraDetails=null},title={Text(camera.getStringProperty("name"))},text={Text("Mapped speed camera · ${camera.getNumberProperty("distance")} m from search location.\nTagged limit: ${camera.getStringProperty("limit")}\nMap tags may be outdated; follow posted signs.")},confirmButton={TextButton(onClick={cameraDetails=null}){Text("Done")}},containerColor=Paper)}
    Dialog(onDismissRequest=onDismiss,properties=DialogProperties(usePlatformDefaultWidth=false)) {
        Surface(Modifier.fillMaxSize(),color=Paper) {
            Column(Modifier.fillMaxSize().safeDrawingPadding()) {
                Row(Modifier.fillMaxWidth().padding(horizontal=12.dp),verticalAlignment=androidx.compose.ui.Alignment.CenterVertically) {
                    TextButton(onClick=onDismiss){Text("Back")}
                    Text("Road map",Modifier.weight(1f),style=MaterialTheme.typography.titleLarge)
                    TextButton(onClick={follow=true}){Text("Recenter")}
                }
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    AndroidView(factory={mapView},modifier=Modifier.fillMaxSize())
                    if(!tilesReady && !renderingError)Surface(Modifier.padding(12.dp),color=Paper){Text(if(slowTiles)"Map tiles are taking longer. Check your connection." else "Loading map tiles…",Modifier.padding(10.dp),color=Ink,fontSize=12.sp)}
                }
                Column(Modifier.fillMaxWidth().padding(horizontal=18.dp,vertical=12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
                    Text(if(drive.simulated)"Simulation: live location is off" else drive.status,fontSize=13.sp)
                    if(drive.latitude==null || drive.simulated)TextButton(onClick={if(drive.simulated)vm.simulated(false);onPermission()}){Text("Enable live location")}
                    Text(when {ui.mapLoading->"Looking for cameras within 3 km…";ui.mapError!=null->ui.mapError!!;ui.mapUpdated==0L->"Waiting for GPS to find nearby cameras";else->"${ui.mapCameras.size} mapped speed cameras · updated ${java.text.SimpleDateFormat("HH:mm",java.util.Locale.getDefault()).format(java.util.Date(ui.mapUpdated))}"},fontSize=13.sp)
                    if(renderingError)Text("Map tiles unavailable. Check your internet connection.",fontSize=12.sp,color=MaterialTheme.colorScheme.error)
                    Note("Blue: your last GPS fix · Amber: mapped cameras. Coverage may be incomplete. Map tiles need internet. © OpenStreetMap contributors.")
                    TextButton(onClick={vm.loadMapCameras(true)},enabled=!ui.mapLoading){Text("Refresh cameras")}
                }
            }
        }
    }
}

