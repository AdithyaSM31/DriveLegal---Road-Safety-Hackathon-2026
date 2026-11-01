package com.drivelegal.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.drivelegal.app.Tab

val BrandBlack=Color(0xFF111313)
val Amber=Color(0xFFFFB800)
val Good=Color(0xFF3BB578)
val Danger=Color(0xFFD9231A)
val DarkCard=Color(0xFF191B1C)
val DriveWhite=Color(0xFFF4F2E9)
val Paper:Color @Composable get()=MaterialTheme.colorScheme.background
val Ink:Color @Composable get()=MaterialTheme.colorScheme.onSurface
val Secondary:Color @Composable get()=MaterialTheme.colorScheme.onSurfaceVariant
val Line:Color @Composable get()=MaterialTheme.colorScheme.outline
val MutedSurface:Color @Composable get()=MaterialTheme.colorScheme.surfaceVariant
private val lightPalette=lightColorScheme(primary=BrandBlack,onPrimary=Color.White,secondary=Amber,onSecondary=BrandBlack,background=Color(0xFFF3F1E9),onBackground=BrandBlack,surface=Color.White,onSurface=BrandBlack,surfaceVariant=Color(0xFFE8E5DC),onSurfaceVariant=Color(0xFF65696D),outline=Color(0xFFE1DED5),error=Danger)
private val darkPalette=darkColorScheme(primary=Amber,onPrimary=BrandBlack,secondary=Amber,onSecondary=BrandBlack,background=Color(0xFF101212),onBackground=DriveWhite,surface=Color(0xFF1D2021),onSurface=DriveWhite,surfaceVariant=Color(0xFF2B2F30),onSurfaceVariant=Color(0xFFADB3B5),outline=Color(0xFF3D4345),error=Color(0xFFFF8D7D))
@Composable fun DriveLegalTheme(dark:Boolean=false,content:@Composable ()->Unit) {
    val scheme=if(dark)darkPalette else lightPalette
    MaterialTheme(colorScheme=scheme,typography=Typography(bodyLarge=androidx.compose.ui.text.TextStyle(fontFamily=FontFamily.SansSerif,fontSize=16.sp,lineHeight=24.sp),titleLarge=androidx.compose.ui.text.TextStyle(fontWeight=FontWeight.Bold,fontSize=24.sp))) {
        androidx.compose.runtime.CompositionLocalProvider(LocalContentColor provides scheme.onBackground,content=content)
    }
}

enum class Glyph { Home,Laws,Drive,Fines,Assistant,Search,Mic,Arrow,Back,Close,Plus,Bell,Bookmark,Cloud,Car,Check,Warning,Settings,Sync,Download,Map,Send,Stop,Voice }
@Composable fun AppIcon(glyph: Glyph, modifier: Modifier=Modifier.size(24.dp), color: Color=Ink) {
    Canvas(modifier) {
        scale(size.width/24f,size.height/24f,pivot=Offset.Zero) {
            val stroke=Stroke(1.8f,cap=StrokeCap.Round)
            fun line(x:Float,y:Float,a:Float,b:Float) = drawLine(color,Offset(x,y),Offset(a,b),1.8f,StrokeCap.Round)
            fun path(vararg points: Pair<Float,Float>,close:Boolean=false) { val p=Path(); points.forEachIndexed { index,point -> if(index==0)p.moveTo(point.first,point.second) else p.lineTo(point.first,point.second) };if(close)p.close();drawPath(p,color,style=stroke) }
            when(glyph) {
                Glyph.Home -> { path(3f to 11f,12f to 3f,21f to 11f);path(5f to 10f,5f to 21f,10f to 21f,10f to 15f,14f to 15f,14f to 21f,19f to 21f,19f to 10f) }
                Glyph.Laws -> {line(12f,3f,12f,21f);line(6f,21f,18f,21f);line(4f,7f,20f,7f);path(6f to 7f,2f to 15f,10f to 15f,6f to 7f);path(18f to 7f,14f to 15f,22f to 15f,18f to 7f);drawArc(color,0f,180f,false,Offset(2f,12f),androidx.compose.ui.geometry.Size(8f,6f),style=stroke);drawArc(color,0f,180f,false,Offset(14f,12f),androidx.compose.ui.geometry.Size(8f,6f),style=stroke) }
                Glyph.Drive -> {drawArc(color,145f,250f,false,Offset(3f,4f),androidx.compose.ui.geometry.Size(18f,18f),style=Stroke(2f,cap=StrokeCap.Round));line(12f,13f,17f,8f);drawCircle(color,1.5f,Offset(12f,13f))}
                Glyph.Fines -> {drawRoundRect(color,Offset(5f,2f),androidx.compose.ui.geometry.Size(14f,20f),androidx.compose.ui.geometry.CornerRadius(2f),style=stroke);line(8f,6f,16f,6f);listOf(10f,14f,18f).forEach { y->drawCircle(color,.9f,Offset(9f,y));drawCircle(color,.9f,Offset(15f,y)) } }
                Glyph.Assistant -> {path(4f to 3f,20f to 3f,20f to 17f,11f to 17f,5f to 22f,5f to 17f,4f to 17f,4f to 3f);path(12f to 6f,13.5f to 9f,17f to 10f,13.5f to 11.5f,12f to 15f,10.5f to 11.5f,7f to 10f,10.5f to 9f,12f to 6f) }
                Glyph.Search -> {drawCircle(color,6.5f,Offset(10f,10f),style=stroke);line(15f,15f,21f,21f)}
                Glyph.Mic -> {drawRoundRect(color,Offset(9f,2f),androidx.compose.ui.geometry.Size(6f,13f),androidx.compose.ui.geometry.CornerRadius(3f),style=stroke);drawArc(color,0f,180f,false,Offset(6f,7f),androidx.compose.ui.geometry.Size(12f,12f),style=stroke);line(12f,19f,12f,23f)}
                Glyph.Arrow,Glyph.Send -> {line(4f,12f,20f,12f);path(14f to 6f,20f to 12f,14f to 18f)}
                Glyph.Back -> {path(15f to 5f,8f to 12f,15f to 19f)}
                Glyph.Close -> {line(6f,6f,18f,18f);line(6f,18f,18f,6f)}
                Glyph.Plus -> {line(12f,4f,12f,20f);line(4f,12f,20f,12f)}
                Glyph.Bell -> {path(5f to 17f,7f to 14f,7f to 8f,9f to 4f,15f to 4f,17f to 8f,17f to 14f,19f to 17f,5f to 17f);line(10f,21f,14f,21f)}
                Glyph.Bookmark -> path(6f to 3f,18f to 3f,18f to 22f,12f to 18f,6f to 22f,6f to 3f)
                Glyph.Cloud -> {val p=Path().apply {moveTo(6f,17f);cubicTo(-1f,17f,0f,8f,7f,9f);cubicTo(8f,1f,20f,3f,19f,10f);cubicTo(25f,11f,24f,17f,18f,17f);close()};drawPath(p,color,style=stroke);line(8f,20f,7f,23f);line(13f,20f,12f,23f);line(18f,20f,17f,23f)}
                Glyph.Car -> {path(3f to 10f,6f to 4f,18f to 4f,21f to 10f,21f to 18f,3f to 18f,3f to 10f,21f to 10f);line(6f,18f,6f,21f);line(18f,18f,18f,21f);line(6f,14f,8f,14f);line(16f,14f,18f,14f)}
                Glyph.Check -> {drawCircle(color,9f,Offset(12f,12f),style=stroke);path(7f to 12f,10f to 15f,17f to 8f)}
                Glyph.Warning -> {path(12f to 2f,23f to 21f,1f to 21f,12f to 2f);line(12f,9f,12f,14f);drawCircle(color,1f,Offset(12f,18f))}
                Glyph.Settings -> {drawCircle(color,7f,Offset(12f,12f),style=stroke);drawCircle(color,2.5f,Offset(12f,12f),style=stroke);listOf(0f,90f,180f,270f).forEach { angle->val r=Math.toRadians(angle.toDouble());val x=kotlin.math.cos(r).toFloat();val y=kotlin.math.sin(r).toFloat();line(12+7*x,12+7*y,12+10*x,12+10*y)} }
                Glyph.Sync -> {drawArc(color,220f,270f,false,Offset(4f,4f),androidx.compose.ui.geometry.Size(16f,16f),style=stroke);path(3f to 3f,4f to 9f,10f to 8f)}
                Glyph.Download -> {line(12f,2f,12f,15f);path(7f to 10f,12f to 15f,17f to 10f);path(3f to 17f,3f to 22f,21f to 22f,21f to 17f)}
                Glyph.Map -> {path(2f to 5f,8f to 2f,16f to 5f,22f to 2f,22f to 19f,16f to 22f,8f to 19f,2f to 22f,2f to 5f);line(8f,2f,8f,19f);line(16f,5f,16f,22f)}
                Glyph.Stop -> drawRoundRect(color,Offset(6f,6f),androidx.compose.ui.geometry.Size(12f,12f),androidx.compose.ui.geometry.CornerRadius(2f))
                Glyph.Voice -> {listOf(5f to 5f,10f to 2f,15f to 7f,20f to 4f).forEach { (x,y)->line(x,y,x,24-y) }}
            }
        }
    }
}
@Composable fun RoundButton(glyph: Glyph, label: String, onClick: ()->Unit, dark: Boolean=false, modifier:Modifier=Modifier) { Surface(onClick=onClick,modifier=modifier.size(46.dp).semantics { contentDescription=label },shape=CircleShape,color=if(dark) BrandBlack else MaterialTheme.colorScheme.surface.copy(alpha=.88f),border=if(dark)null else BorderStroke(1.dp,Line)) { Box(contentAlignment=Alignment.Center){AppIcon(glyph,color=if(dark)Amber else Ink)} } }
@Composable fun GlassCard(modifier:Modifier=Modifier, dark:Boolean=false, content:@Composable ColumnScope.()->Unit) { Surface(modifier=modifier,shape=RoundedCornerShape(26.dp),color=if(dark)DarkCard else MaterialTheme.colorScheme.surface.copy(alpha=.90f),contentColor=if(dark)DriveWhite else Ink,border=if(dark)null else BorderStroke(1.dp,Line),shadowElevation=0.dp) { Column(Modifier.padding(20.dp),content=content) } }
@Composable fun Pill(text:String,onClick:()->Unit,selected:Boolean=false,modifier:Modifier=Modifier) { Surface(onClick=onClick,modifier=modifier,shape=RoundedCornerShape(50),color=if(selected)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface.copy(alpha=.35f),contentColor=if(selected)MaterialTheme.colorScheme.onPrimary else Ink,border=if(selected)null else BorderStroke(1.dp,Line)){Text(text,Modifier.padding(horizontal=17.dp,vertical=11.dp),fontSize=13.sp,fontWeight=FontWeight.SemiBold)} }
@Composable fun PageTitle(title:String,subtitle:String,action:(@Composable ()->Unit)?=null) { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Column(Modifier.weight(1f)){Text(title,fontSize=33.sp,fontWeight=FontWeight.Bold,letterSpacing=(-1).sp);Spacer(Modifier.height(7.dp));Text(subtitle,fontSize=14.sp,lineHeight=20.sp,color=Secondary)};action?.invoke()} }
@Composable fun Caption(text:String,modifier:Modifier=Modifier,color:Color=Secondary) { Text(text.uppercase(),modifier,fontSize=11.sp,fontWeight=FontWeight.Bold,letterSpacing=1.2.sp,color=color) }
@Composable fun AmberButton(text:String,onClick:()->Unit,modifier:Modifier=Modifier,enabled:Boolean=true) { Button(onClick=onClick,modifier=modifier.heightIn(min=50.dp),enabled=enabled,shape=CircleShape,colors=ButtonDefaults.buttonColors(containerColor=Amber,contentColor=BrandBlack)){Text(text,fontWeight=FontWeight.Bold,fontSize=15.sp);Spacer(Modifier.width(10.dp));AppIcon(Glyph.Arrow,Modifier.size(19.dp),BrandBlack)} }
@Composable fun Note(text:String,modifier:Modifier=Modifier) { Text(text,modifier,fontSize=11.sp,lineHeight=17.sp,color=Secondary) }
@Composable fun BottomBar(tab:Tab,onTab:(Tab)->Unit) {
    Surface(Modifier.fillMaxWidth().padding(horizontal=13.dp).navigationBarsPadding(),shape=RoundedCornerShape(34.dp),color=MaterialTheme.colorScheme.surface.copy(alpha=.94f),shadowElevation=8.dp,border=BorderStroke(1.dp,Line)) {
        Row(Modifier.padding(horizontal=5.dp,vertical=9.dp),horizontalArrangement=Arrangement.SpaceAround,verticalAlignment=Alignment.CenterVertically) {
            Tab.entries.forEach { item -> val active=item==tab;Column(Modifier.weight(1f).clip(RoundedCornerShape(22.dp)).clickable {onTab(item)}.padding(vertical=3.dp).semantics {contentDescription="${item.name} tab"},horizontalAlignment=Alignment.CenterHorizontally) {
                if(item==Tab.Drive) Box(Modifier.size(48.dp).background(Amber,CircleShape),contentAlignment=Alignment.Center){AppIcon(Glyph.Drive,Modifier.size(27.dp),BrandBlack)}
                else {Box(Modifier.height(34.dp),contentAlignment=Alignment.Center){AppIcon(when(item){Tab.Home->Glyph.Home;Tab.Laws->Glyph.Laws;Tab.Fines->Glyph.Fines;else->Glyph.Assistant},color=if(active)Ink else Secondary)}}
                Text(item.name,fontSize=10.sp,fontWeight=if(active)FontWeight.Bold else FontWeight.Medium,color=if(active)Ink else Secondary)
            } }
        }
    }
}
