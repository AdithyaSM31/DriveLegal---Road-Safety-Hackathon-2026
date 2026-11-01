package com.drivelegal.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.drivelegal.app.data.*
import com.drivelegal.app.ui.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

class MainActivity:ComponentActivity() {
    private val vm:MainViewModel by viewModels()
    private var speaker:TextToSpeech?=null
    override fun onCreate(savedInstanceState:Bundle?) {super.onCreate(savedInstanceState);enableEdgeToEdge();setContent {val state by vm.ui.collectAsStateWithLifecycle();DriveLegalTheme(dark=state.darkMode) {DriveLegalApp(vm,::openURL,::readStatus)}}}
    private val displayListener=object:android.hardware.display.DisplayManager.DisplayListener {
        override fun onDisplayAdded(id:Int) {preferPeakRefreshRate()}
        override fun onDisplayRemoved(id:Int) {}
        override fun onDisplayChanged(id:Int) {if(window.decorView.display?.displayId==id)preferPeakRefreshRate()}
    }
    @Suppress("DEPRECATION")
    private fun preferPeakRefreshRate() {
        val screen=window.decorView.display ?: windowManager.defaultDisplay
        val current=screen.mode
        val peak=screen.supportedModes.filter {it.physicalWidth==current.physicalWidth && it.physicalHeight==current.physicalHeight}.maxOfOrNull {it.refreshRate} ?: screen.refreshRate
        val attributes=window.attributes
        if(kotlin.math.abs(attributes.preferredRefreshRate-peak)>.1f) {
            // Refresh-rate preference only: do not change resolution or force a display mode.
            attributes.preferredRefreshRate=peak
            window.attributes=attributes
        }
    }
    override fun onStart(){super.onStart();getSystemService(android.hardware.display.DisplayManager::class.java).registerDisplayListener(displayListener,android.os.Handler(mainLooper));window.decorView.post {preferPeakRefreshRate()};vm.appForeground(true)}
    override fun onStop(){getSystemService(android.hardware.display.DisplayManager::class.java).unregisterDisplayListener(displayListener);vm.appForeground(false);speaker?.stop();super.onStop()}
    override fun onDestroy(){speaker?.shutdown();speaker=null;super.onDestroy()}
    private fun openURL(value:String) {runCatching {val uri=Uri.parse(value);require(uri.scheme in listOf("https","http","geo"));startActivity(Intent(Intent.ACTION_VIEW,uri))}.onFailure {vm.notice("No app is available to open this link.")}}
    private fun readStatus() {
        val d=vm.drive.value
        val text="${if(d.simulated)"Simulation. " else ""}${d.speed?.let {"$it kilometres per hour. "} ?: "Reliable speed unavailable. "}${d.label}."
        if(speaker==null){speaker=TextToSpeech(this){status->if(status==TextToSpeech.SUCCESS){speaker?.language=Locale.ENGLISH;speaker?.speak(text,TextToSpeech.QUEUE_FLUSH,null,"drive-status") }else vm.notice("Speech output is unavailable on this device.")}}
        else speaker?.speak(text,TextToSpeech.QUEUE_FLUSH,null,"drive-status")
    }
}
@Composable private fun DriveLegalApp(vm:MainViewModel,onURL:(String)->Unit,onRead:()->Unit) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val context=androidx.compose.ui.platform.LocalContext.current
    val activity=context as ComponentActivity
    val scope=rememberCoroutineScope()
    var regionDialog by remember {mutableStateOf(false)}
    var settingsDialog by remember {mutableStateOf(false)}
    var accountDialog by remember {mutableStateOf(false)}
    var coverageDialog by remember {mutableStateOf(false)}
    var limitDialog by remember {mutableStateOf(false)}
    var contextDialog by remember {mutableStateOf(false)}
    var detail by remember {mutableStateOf<Law?>(null)}
    var explanation by remember {mutableStateOf<Estimate?>(null)}
    var voiceDraft by remember {mutableStateOf("")}
    val snack=remember {SnackbarHostState()}
    val permissions=rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()){result->vm.startDrive();if(result.values.none {it})vm.notice("Location permission was declined. You can still use simulation, laws, and fine estimates.")}
    val homeLocation=rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()){vm.appForeground(true)}
    LaunchedEffect(ui.account?.uid,ui.guestMode) {
        if(ui.account!=null || ui.guestMode) {
            if(ui.account!=null && ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED)
                homeLocation.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION))
            else vm.appForeground(true)
        }
    }
    val voice=rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()){result->val text=result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull();if(!text.isNullOrBlank()){if(ui.tab==Tab.Laws)vm.query(text) else voiceDraft=text}}
    fun startDrive() {
        val granted=ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
        if(vm.drive.value.simulated || granted)vm.startDrive() else permissions.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION))
    }
    fun voiceInput() {
        val intent=Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_PROMPT,"Ask about a traffic rule or fine").putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true)
        runCatching {voice.launch(intent)}.onFailure {vm.notice("No speech recognition service is installed. You can type your question.")}
    }
    fun export(estimate:Estimate) {
        scope.launch {runCatching {withContext(Dispatchers.IO){NativeReport.create(context,estimate)}}.onSuccess {uri->runCatching {context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION),"Share estimate"))}.onFailure {vm.notice("No app is available to share the PDF.")}}.onFailure {vm.notice("PDF export failed: ${it.message}")}}
    }
    SideEffect {WindowCompat.getInsetsController(activity.window,activity.window.decorView).isAppearanceLightStatusBars=ui.tab!=Tab.Drive && !ui.darkMode;WindowCompat.getInsetsController(activity.window,activity.window.decorView).isAppearanceLightNavigationBars=ui.tab!=Tab.Drive && !ui.darkMode}
    LaunchedEffect(ui.notice) {ui.notice?.let {snack.showSnackbar(it);vm.notice(null)}}
    Box(Modifier.fillMaxSize().background(if(ui.tab==Tab.Drive)Brush.verticalGradient(listOf(Color(0xFF101212),Color(0xFF101212))) else Brush.verticalGradient(listOf(Paper,Paper,if(ui.darkMode)Paper else Color(0xFFEDEADF)))).safeDrawingPadding()) {
        if(ui.account==null && !ui.guestMode) {
            SignInScreen(ui,vm,{vm.google(activity)},Modifier.fillMaxSize())
        } else if(ui.snapshot==null) {
            Column(Modifier.align(Alignment.Center).padding(30.dp),horizontalAlignment=Alignment.CenterHorizontally){Text(if(ui.error==null)"Getting your road essentials ready…" else "Library unavailable",fontSize=22.sp,fontWeight=FontWeight.Bold);ui.error?.let {Text(it,Modifier.padding(top=10.dp),color=Secondary)}}
        } else {
            Box(Modifier.widthIn(max=840.dp).fillMaxSize().align(Alignment.TopCenter)) {
                when(ui.tab) {
                    Tab.Home->HomeScreen(ui,vm,::startDrive,{limitDialog=true},{settingsDialog=true},{coverageDialog=true},{contextDialog=true},{vm.mapOpen(true)})
                    Tab.Laws->LawsScreen(ui,vm,{regionDialog=true},{detail=it},::voiceInput)
                    Tab.Fines->FinesScreen(ui,vm,{regionDialog=true},{explanation=it},::export)
                    Tab.Assistant->AssistantScreen(ui,vm,{regionDialog=true},::voiceInput,voiceDraft,{voiceDraft=""},onURL)
                    Tab.Drive->DriveScreen(vm,ui,{vm.navigate(Tab.Home)},{limitDialog=true},onRead,::startDrive,{contextDialog=true})
                }
                if(ui.tab!=Tab.Drive)Box(Modifier.align(Alignment.BottomCenter).padding(bottom=8.dp).widthIn(max=600.dp)){BottomBar(ui.tab){tab->if(tab==Tab.Drive)startDrive() else vm.navigate(tab)}}
            }
        }
        SnackbarHost(snack,Modifier.align(Alignment.BottomCenter).padding(bottom=105.dp,start=16.dp,end=16.dp))
    }
    if(regionDialog)AlertDialog(onDismissRequest={regionDialog=false},title={Text("Choose jurisdiction")},text={Column(Modifier.heightIn(max=450.dp).verticalScroll(rememberScrollState())){TextButton(onClick={vm.automaticRegion();regionDialog=false}){Text("Use GPS state automatically" + (ui.locationRegion?.let {" · $it"} ?: ""))};ui.snapshot?.regions?.forEach {r->TextButton(onClick={vm.region(r.id);regionDialog=false},modifier=Modifier.fillMaxWidth()){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(if(r.national)"${r.name} · central records" else r.name,color=Ink);if(r.id==ui.regionId)AppIcon(Glyph.Check,Modifier.size(20.dp))}}}}},confirmButton={TextButton(onClick={regionDialog=false}){Text("Done")}},containerColor=Paper)
    if(ui.mapOpen) RoadMapDialog(vm,onDismiss={vm.mapOpen(false)},onPermission={homeLocation.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION))})
    if(settingsDialog)SettingsDialog(ui,onDismiss={settingsDialog=false},onDarkMode=vm::darkMode,onAccount={settingsDialog=false;accountDialog=true;vm.clearAuthError()},onLogout={settingsDialog=false;vm.signOut()},onSave={name,backend,low->if(vm.settings(name,backend,low))settingsDialog=false})
    if(accountDialog)AccountDialog(ui,vm,onGoogle={vm.google(activity)},onDismiss={accountDialog=false})
    if(limitDialog)LimitDialog(vm.drive.value.postedLimit,onDismiss={limitDialog=false},onSave={vm.limit(it);limitDialog=false})
    if(coverageDialog)CoverageDialog(ui,onDismiss={coverageDialog=false},onSync=vm::sync,onCheck=vm::checkBackend,onRegion={coverageDialog=false;regionDialog=true})
    if(contextDialog)AlertDialog(onDismissRequest={contextDialog=false},title={Text("Road context")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){Text("Weather sends your current coordinates to Open-Meteo; speed limits use OpenStreetMap. Camera lookup sends them to your backend and OpenStreetMap. Weather and mapped speed limits refresh automatically with foreground GPS.",fontSize=13.sp,lineHeight=20.sp);ui.weather?.let {Text(it,fontSize=13.sp)};ui.cameras?.let {Text(it,fontSize=13.sp)};if(ui.contextBusy)Text("Loading…",fontSize=13.sp);TextButton(onClick={vm.refreshContext(false)},enabled=!ui.contextBusy){Text("Request weather")};TextButton(onClick={vm.refreshContext(true)},enabled=!ui.contextBusy){Text("Find mapped cameras")}}},confirmButton={TextButton(onClick={contextDialog=false}){Text("Done")}},containerColor=Paper)
    detail?.let {law->LawSheet(law,law.key in ui.bookmarks,{detail=null},{vm.bookmark(law)},{vm.estimateLaw(law);detail=null},onURL)}
    explanation?.let {estimate->AlertDialog(onDismissRequest={explanation=null},title={Text("Your estimate explained")},text={Column(Modifier.heightIn(max=450.dp).verticalScroll(rememberScrollState())){Text("${if(estimate.repeated)"Repeat" else "First"} offence amounts · ${currency(estimate.total)}",fontWeight=FontWeight.Bold);Spacer(Modifier.height(15.dp));estimate.rows.forEach {law->Text(law.name,fontWeight=FontWeight.SemiBold,fontSize=14.sp);Text("§${law.section} · ${law.region} · ${currency(law.amount(estimate.repeated))}",fontSize=12.sp);law.licence?.let {Text(it,color=MaterialTheme.colorScheme.error,fontSize=12.sp)};law.imprisonment?.let {Text(it,color=MaterialTheme.colorScheme.error,fontSize=12.sp)};Text("Compounding: ${currency(law.compounding)} (separate)",fontSize=12.sp);Text("Effective: ${law.effective ?: "Not recorded"}",color=Secondary,fontSize=11.sp);TextButton(onClick={law.sourceUrl?.let(onURL)}){Text("Open source",fontSize=11.sp)};HorizontalDivider(Modifier.padding(bottom=12.dp))};Note("This is a sum of dataset amounts, not a guaranteed final challan. Current law has not been independently verified.")}},confirmButton={TextButton(onClick={export(estimate)}){Text("Share PDF")}},dismissButton={TextButton(onClick={explanation=null}){Text("Close")}},containerColor=Paper)}
}
