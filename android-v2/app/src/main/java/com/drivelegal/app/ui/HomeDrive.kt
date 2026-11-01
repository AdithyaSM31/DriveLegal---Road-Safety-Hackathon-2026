package com.drivelegal.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.drivelegal.app.*
import java.time.LocalTime

@Composable fun SpeedSign(limit:Int?, onClick:()->Unit, dark:Boolean=false, size:Int=74) {
    Column(horizontalAlignment=Alignment.CenterHorizontally) {
        Surface(onClick=onClick,modifier=Modifier.size(size.dp).semantics {contentDescription="Set posted speed limit"},shape=CircleShape,color=Color.White,border=androidx.compose.foundation.BorderStroke((size/9).dp,Danger)) { Box(contentAlignment=Alignment.Center){Text(limit?.toString() ?: "—",fontSize=(size/3).sp,fontWeight=FontWeight.Bold,color=BrandBlack)} }
        Spacer(Modifier.height(6.dp));Caption("Speed limit",color=if(dark)Color(0xFF96999C) else Secondary)
    }
}
@Composable fun HomeScreen(ui:AppState,vm:MainViewModel,onStart:()->Unit,onLimit:()->Unit,onSettings:()->Unit,onCoverage:()->Unit,onContext:()->Unit,onMap:()->Unit) {
    val drive by vm.drive.collectAsStateWithLifecycle()
    val greeting=remember { when(LocalTime.now().hour){in 0..11->"Good morning,";in 12..16->"Good afternoon,";else->"Good evening,"} }
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(start=20.dp,end=20.dp,top=14.dp,bottom=125.dp),verticalArrangement=Arrangement.spacedBy(24.dp)) {
        item {Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){BrandLogo(40.dp);Text("DriveLegal",Modifier.padding(start=10.dp).weight(1f),fontSize=22.sp,fontWeight=FontWeight.Bold);RoundButton(Glyph.Bell,"Data & updates",onCoverage);Spacer(Modifier.width(8.dp));ProfileAvatar(ui.account?.photoUrl,ui.account?.name ?: ui.name,onSettings)}}
        item {Column {Text(greeting,color=Secondary,fontSize=16.sp);Text((ui.account?.name ?: ui.name).ifBlank {"Ready for the road?"},fontSize=32.sp,lineHeight=38.sp,fontWeight=FontWeight.Bold,letterSpacing=(-.8).sp)}}
        item {GlassCard(dark=true,modifier=Modifier.fillMaxWidth()) {
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Box(Modifier.size(7.dp).background(if(drive.simulated)Amber else if(drive.latitude!=null)Good else Secondary,CircleShape));Spacer(Modifier.width(8.dp));Text(if(drive.simulated)"Simulation" else drive.status,Modifier.weight(1f),fontSize=11.sp,color=Color(0xFFBBC0C1),maxLines=2);Text("Demo",fontSize=11.sp,color=Color(0xFFBBC0C1));Switch(checked=drive.simulated,onCheckedChange=vm::simulated,modifier=Modifier.padding(start=5.dp).height(32.dp).semantics {contentDescription="Simulation"},colors=SwitchDefaults.colors(checkedTrackColor=Amber,checkedThumbColor=Ink,uncheckedTrackColor=Color(0xFF303334),uncheckedThumbColor=Color(0xFF8E9294),uncheckedBorderColor=Color.Transparent))}
            Spacer(Modifier.height(27.dp));Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){Column{Caption("Your speed",color=Color(0xFF93999A));Row(verticalAlignment=Alignment.Bottom){Text(drive.speed?.toString() ?: "0",fontSize=70.sp,lineHeight=80.sp,fontWeight=FontWeight.SemiBold,fontFamily=FontFamily.Monospace,color=DriveWhite);Text("km/h",Modifier.padding(start=9.dp,bottom=10.dp),fontSize=16.sp,color=Color(0xFF93999A))}};SpeedSign(drive.postedLimit,onLimit,true)}
            Spacer(Modifier.height(20.dp));HorizontalDivider(color=Color(0xFF303334));Spacer(Modifier.height(18.dp));Row(verticalAlignment=Alignment.CenterVertically){AppIcon(if(drive.over)Glyph.Warning else Glyph.Check,Modifier.size(17.dp),if(drive.over)Color(0xFFFF8D7D) else Good);Text(if(drive.simulated)"Demo only" else "Follow posted signs",Modifier.padding(start=7.dp).weight(1f),fontSize=11.sp,color=if(drive.over)Color(0xFFFF8D7D) else Good);AmberButton("Start drive",onStart)}
        }}
        item {Column {Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text("On this road",fontSize=18.sp,fontWeight=FontWeight.Bold);TextButton(onClick=onMap){Text("Open map",color=Ink,fontSize=13.sp);AppIcon(Glyph.Arrow,Modifier.padding(start=6.dp).size(17.dp))}};Spacer(Modifier.height(10.dp));Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){GlassCard(Modifier.weight(1f).clickable(onClick=onCoverage)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Traffic",color=Secondary,fontSize=12.sp);AppIcon(Glyph.Car,Modifier.size(20.dp),Secondary)};Spacer(Modifier.height(10.dp));Text("No live feed",fontSize=18.sp,fontWeight=FontWeight.Bold);Note("Never inferred from speed")};GlassCard(Modifier.weight(1f).clickable(onClick=onContext)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text("Weather",color=Secondary,fontSize=12.sp);AppIcon(Glyph.Cloud,Modifier.size(20.dp),Secondary)};Spacer(Modifier.height(10.dp));Text(ui.weather?.substringBefore('\n') ?: "Waiting for location",fontSize=18.sp,fontWeight=FontWeight.Bold);Note(if(ui.contextBusy)"Loading…" else "Open-Meteo · automatic")}}}}
        item {Column {Text("Quick actions",fontSize=18.sp,fontWeight=FontWeight.Bold);Spacer(Modifier.height(15.dp));Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceAround){listOf(Triple(Glyph.Bookmark,"Saved",Tab.Laws),Triple(Glyph.Fines,"Fines",Tab.Fines),Triple(Glyph.Laws,"All laws",Tab.Laws),Triple(Glyph.Assistant,"Ask",Tab.Assistant)).forEach { (glyph,label,tab)->Column(horizontalAlignment=Alignment.CenterHorizontally){Surface(onClick={vm.savedOnly(label=="Saved");vm.navigate(tab)},shape=androidx.compose.foundation.shape.RoundedCornerShape(22.dp),color=if(label=="Ask")BrandBlack else MaterialTheme.colorScheme.surface.copy(alpha=.9f),border=androidx.compose.foundation.BorderStroke(1.dp,Line)){Box(Modifier.size(59.dp),contentAlignment=Alignment.Center){AppIcon(glyph,Modifier.size(25.dp),if(label=="Ask")Amber else Ink)}};Spacer(Modifier.height(7.dp));Text(label,fontSize=11.sp,color=Secondary)}}}}}
        item {GlassCard(Modifier.fillMaxWidth()){Row(verticalAlignment=Alignment.CenterVertically){AppIcon(Glyph.Check,Modifier.size(20.dp),Good);Text("Your library travels with you.",Modifier.padding(start=10.dp),fontSize=14.sp,fontWeight=FontWeight.SemiBold)};Spacer(Modifier.height(9.dp));Note("${ui.snapshot?.laws?.size ?: 0} fine schedules across ${ui.snapshot?.regions?.size ?: 0} jurisdictions. Available offline, with source dates and coverage made clear.");TextButton(onClick=onCoverage,contentPadding=PaddingValues(0.dp)){Text("Data & coverage",color=Ink);AppIcon(Glyph.Arrow,Modifier.padding(start=9.dp).size(16.dp))}}}
    }
}
@Composable fun DriveScreen(vm:MainViewModel,ui:AppState,onEnd:()->Unit,onLimit:()->Unit,onVoice:()->Unit,onPermission:()->Unit,onContext:()->Unit) {
    val drive by vm.drive.collectAsStateWithLifecycle()
    BackHandler(onBack=onEnd)
    Box(Modifier.fillMaxSize().background(Color(0xFF101212))) {
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(start=20.dp,end=20.dp,top=15.dp,bottom=125.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(25.dp)) {
        item {Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Surface(onClick=onEnd,shape=CircleShape,color=Color(0xFF202324)){Box(Modifier.size(46.dp),contentAlignment=Alignment.Center){AppIcon(Glyph.Back,color=DriveWhite)}};Column(Modifier.weight(1f),horizontalAlignment=Alignment.CenterHorizontally){Text("Drive mode",color=DriveWhite,fontSize=20.sp,fontWeight=FontWeight.Bold);Text(if(drive.simulated)"Simulation · no GPS" else drive.status,color=Color(0xFFA1A5A6),fontSize=11.sp)};Surface(shape=CircleShape,color=Color(0xFF202324)){Text(if(drive.simulated)"● Demo" else if(drive.speed!=null)"● GPS" else "● Waiting",Modifier.padding(10.dp),fontSize=10.sp,fontWeight=FontWeight.Bold,color=if(drive.simulated)Amber else Good)}}}
        item {BoxWithConstraints(Modifier.widthIn(max=330.dp).fillMaxWidth().aspectRatio(1f),contentAlignment=Alignment.Center) {
            Canvas(Modifier.fillMaxSize().padding(15.dp)) {
                val width=size.minDimension*.055f;val inset=width/2;val bounds=Size(size.width-width,size.height-width)
                drawArc(Color(0xFF26292A),135f,270f,false,Offset(inset,inset),bounds,style=Stroke(width,cap=StrokeCap.Round))
                val progress=((drive.speed ?: 0)/120f).coerceIn(0f,1f)
                if(progress>0)drawArc(if(drive.over)Color(0xFFFF5F52) else Amber,135f,progress*270f,false,Offset(inset,inset),bounds,style=Stroke(width,cap=StrokeCap.Round))
            }
            Column(Modifier.offset(y=(-7).dp),horizontalAlignment=Alignment.CenterHorizontally){Text(drive.speed?.toString() ?: "0",fontSize=88.sp,lineHeight=100.sp,fontWeight=FontWeight.Medium,fontFamily=FontFamily.Monospace,color=DriveWhite);Caption("km/h",color=Color(0xFF979C9D))}
            Text("60",Modifier.align(Alignment.TopCenter).padding(top=43.dp),color=Color(0xFF83898B),fontSize=12.sp,fontFamily=FontFamily.Monospace)
            Box(Modifier.align(Alignment.BottomCenter).offset(y=17.dp)){SpeedSign(drive.postedLimit,onLimit,true,83)}
        }}
        item {Spacer(Modifier.height(18.dp));Surface(shape=androidx.compose.foundation.shape.RoundedCornerShape(25.dp),color=if(drive.over)Danger else DarkCard,modifier=Modifier.fillMaxWidth()){Row(Modifier.padding(20.dp),verticalAlignment=Alignment.CenterVertically){AppIcon(if(drive.over)Glyph.Warning else Glyph.Check,Modifier.size(24.dp),if(drive.over)Color.White else Good);Column(Modifier.padding(start=15.dp)){Text(drive.label,color=DriveWhite,fontSize=18.sp,fontWeight=FontWeight.Bold);Spacer(Modifier.height(5.dp));Text(if(drive.postedLimit==null)"Tap the sign to enter the limit you see on the road." else if(drive.automaticLimit)"OpenStreetMap estimate · follow posted signs." else "Compared with your manually entered posted limit.",color=if(drive.over)Color.White.copy(alpha=.9f) else Color(0xFFABB0B1),fontSize=12.sp,lineHeight=18.sp)}}}}
        if(drive.simulated) item {GlassCard(Modifier.fillMaxWidth(),dark=true){Caption("Demo speed",color=Amber);Slider(modifier=Modifier.semantics {contentDescription="Demo speed"},value=(drive.speed ?: 0).toFloat(),onValueChange={vm.simulatedSpeed(it.toInt())},valueRange=0f..120f,colors=SliderDefaults.colors(thumbColor=Amber,activeTrackColor=Amber,inactiveTrackColor=Color(0xFF424648),inactiveTickColor=Color(0xFF424648)));Text("Drag to test the gauge. No GPS or timer is running.",color=Color(0xFFABB0B1),fontSize=11.sp)}}
        if(!drive.simulated && drive.speed==null) item {OutlinedButton(onClick=onPermission){Text("Check location permission",color=DriveWhite,fontSize=12.sp)}}
        item {Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){GlassCard(Modifier.weight(1f),dark=true){Row(verticalAlignment=Alignment.CenterVertically){AppIcon(Glyph.Car,Modifier.size(21.dp),Color(0xFF9FA5A6));Column(Modifier.padding(start=11.dp)){Text("Traffic",color=Color(0xFF9FA5A6),fontSize=11.sp);Text("Unavailable",color=DriveWhite,fontWeight=FontWeight.Bold,fontSize=15.sp)}}};GlassCard(Modifier.weight(1f).clickable(onClick=onContext),dark=true){Row(verticalAlignment=Alignment.CenterVertically){AppIcon(Glyph.Cloud,Modifier.size(21.dp),Color(0xFF9FA5A6));Column(Modifier.padding(start=11.dp)){Text("Weather",color=Color(0xFF9FA5A6),fontSize=11.sp);Text(ui.weather?.substringBefore('\n') ?: "Fetching with GPS",color=DriveWhite,fontWeight=FontWeight.Bold,fontSize=15.sp)}}}}}

        item {Text(if(drive.simulated)"SIMULATION" else if(ui.lowPower)"LOW-POWER GPS · FOREGROUND ONLY" else "GPS · FOREGROUND ONLY",color=Color(0xFF7E8586),fontSize=9.sp,letterSpacing=1.sp)}
    }
        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color(0xFF101212)).padding(start=20.dp,end=20.dp,top=14.dp,bottom=14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){Surface(onClick=onVoice,modifier=Modifier.semantics {contentDescription="Read drive status"},shape=CircleShape,color=Color(0xFF222526)){Box(Modifier.size(56.dp),contentAlignment=Alignment.Center){AppIcon(Glyph.Voice,color=Amber)}};Button(onClick=onEnd,modifier=Modifier.weight(1f).height(56.dp),colors=ButtonDefaults.buttonColors(containerColor=DriveWhite,contentColor=BrandBlack),shape=CircleShape){AppIcon(Glyph.Stop,Modifier.size(16.dp),BrandBlack);Spacer(Modifier.width(10.dp));Text("End drive",fontSize=17.sp,fontWeight=FontWeight.Bold)}}
    }
}

@Composable private fun ProfileAvatar(url:String?,name:String,onClick:()->Unit) {
    var bitmap by remember(url) {mutableStateOf<android.graphics.Bitmap?>(null)}
    LaunchedEffect(url) {
        bitmap=null
        if(url?.startsWith("https://")==true) bitmap=kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            runCatching {
                val connection=java.net.URL(url).openConnection().apply {connectTimeout=8000;readTimeout=8000}
                connection.getInputStream().use {android.graphics.BitmapFactory.decodeStream(it)}
            }.getOrNull()
        }
    }
    Surface(onClick=onClick,shape=CircleShape,color=BrandBlack,modifier=Modifier.size(44.dp).semantics {contentDescription="Profile and settings"}) {
        Box(contentAlignment=Alignment.Center) {
            if(bitmap!=null) androidx.compose.foundation.Image(bitmap!!.asImageBitmap(),contentDescription="Google profile photo",modifier=Modifier.fillMaxSize(),contentScale=androidx.compose.ui.layout.ContentScale.Crop)
            else Text(name.split(" ").filter {it.isNotBlank()}.take(2).joinToString(""){it.take(1)}.uppercase().ifBlank {"G"},color=Amber,fontWeight=FontWeight.Bold)
        }
    }
}
