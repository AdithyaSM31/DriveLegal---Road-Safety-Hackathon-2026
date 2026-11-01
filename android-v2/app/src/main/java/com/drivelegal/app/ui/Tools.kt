package com.drivelegal.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.drivelegal.app.*
import com.drivelegal.app.data.*

@Composable fun RegionChip(ui:AppState,onClick:()->Unit) { val region=ui.snapshot?.regions?.find { it.id==ui.regionId };Pill(region?.let { if(it.national)"Central records" else it.name } ?: "Choose region",onClick) }
@Composable fun LawsScreen(ui:AppState,vm:MainViewModel,onRegion:()->Unit,onLaw:(Law)->Unit,onVoice:()->Unit) {
    val rows=remember(ui.snapshot,ui.regionId,ui.query,ui.category,ui.savedOnly,ui.bookmarks) { filterLaws(ui.snapshot?.laws.orEmpty(),ui.regionId,ui.query,ui.category,if(ui.savedOnly)ui.bookmarks else null) }
    val categories=remember(ui.snapshot) { ui.snapshot?.laws.orEmpty().map { it.category }.distinct() }
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp,16.dp,20.dp,125.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        item {PageTitle(if(ui.savedOnly)"Saved laws" else "Traffic laws","Motor Vehicles Act · supplied project records");Spacer(Modifier.height(20.dp))}
        item {Surface(shape=CircleShape,color=MaterialTheme.colorScheme.surface.copy(alpha=.91f),border=BorderStroke(1.dp,Line)){Row(Modifier.fillMaxWidth().padding(start=17.dp,end=7.dp),verticalAlignment=Alignment.CenterVertically){AppIcon(Glyph.Search,Modifier.size(21.dp),Secondary);TextField(value=ui.query,onValueChange=vm::query,modifier=Modifier.weight(1f),placeholder={Text("Search a rule, section or fine",fontSize=13.sp)},singleLine=true,colors=TextFieldDefaults.colors(focusedContainerColor=Color.Transparent,unfocusedContainerColor=Color.Transparent,focusedIndicatorColor=Color.Transparent,unfocusedIndicatorColor=Color.Transparent));RoundButton(Glyph.Mic,"Voice search",onVoice)}}}
        item {Row(Modifier.horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(8.dp)){Pill("All",{vm.category(null)},ui.category==null);categories.forEach { category->Pill(category,{vm.category(category)},ui.category==category) };Pill(if(ui.savedOnly)"★ Saved only" else "Saved",{vm.savedOnly(!ui.savedOnly)},ui.savedOnly)}}
        item {Row(Modifier.fillMaxWidth().padding(top=6.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Caption("${rows.size} ${if(rows.size==1)"record" else "records"}");RegionChip(ui,onRegion)}}
        if(rows.isEmpty())item {GlassCard(Modifier.fillMaxWidth()){Text("No records found.",fontSize=20.sp,fontWeight=FontWeight.Bold);Spacer(Modifier.height(10.dp));Note("Try another search or jurisdiction. A missing record does not mean there is no penalty.")}}
        items(rows,key={it.key}) { row -> Surface(onClick={onLaw(row)},shape=RoundedCornerShape(25.dp),color=MaterialTheme.colorScheme.surface.copy(alpha=.92f),border=BorderStroke(1.dp,Line)) {
            Row(Modifier.fillMaxWidth().padding(16.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(13.dp)) {
                Box(Modifier.size(52.dp).background(Paper,RoundedCornerShape(16.dp)),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Text("SEC.",fontSize=8.sp,color=Secondary);Text(row.section.removePrefix("§").trim(),fontSize=12.sp,fontWeight=FontWeight.Bold,maxLines=1,softWrap=false)}}
                Column(Modifier.weight(1f)){Text(row.name,fontSize=15.sp,lineHeight=19.sp,fontWeight=FontWeight.SemiBold);Spacer(Modifier.height(5.dp));Text(row.vehicle ?: "Any vehicle",fontSize=11.sp,color=Secondary);row.licence?.let {Text(it,fontSize=10.sp,color=MaterialTheme.colorScheme.error,lineHeight=14.sp)}}
                Column(horizontalAlignment=Alignment.End){Text(currency(row.first),fontSize=17.sp,fontWeight=FontWeight.Bold);IconButton(onClick={vm.bookmark(row)},modifier=Modifier.size(36.dp)){AppIcon(Glyph.Bookmark,Modifier.size(18.dp),if(row.key in ui.bookmarks)Amber else Secondary)}}
            }
        }}
        item {Note("First-offence amounts from the historical dataset. Open a record for repeat amounts, consequences, effective date, and source. Current amendments have not been verified.",Modifier.padding(top=10.dp))}
    }
}
@Composable fun FinesScreen(ui:AppState,vm:MainViewModel,onRegion:()->Unit,onExplain:(Estimate)->Unit,onExport:(Estimate)->Unit) {
    val rows=remember(ui.snapshot,ui.regionId,ui.vehicle){calculatorRows(ui.snapshot?.laws.orEmpty(),ui.regionId,ui.vehicle)}
    val estimate=remember(rows,ui.selected,ui.repeated){Estimate(rows.filter { it.key in ui.selected },ui.repeated)}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp,16.dp,20.dp,125.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
        item {PageTitle("Fine calculator","A breakdown from the selected region’s records.")}
        item {RegionChip(ui,onRegion)}
        item {Surface(shape=RoundedCornerShape(22.dp),color=MutedSurface){Row(Modifier.fillMaxWidth().padding(4.dp)){listOf("Two-wheeler","Car","Heavy").forEach { vehicle->Surface(onClick={vm.vehicle(vehicle)},modifier=Modifier.weight(1f),shape=RoundedCornerShape(18.dp),color=if(ui.vehicle==vehicle)MaterialTheme.colorScheme.surface else Color.Transparent,shadowElevation=if(ui.vehicle==vehicle)2.dp else 0.dp){Text(vehicle,Modifier.padding(vertical=14.dp),textAlign=androidx.compose.ui.text.style.TextAlign.Center,fontSize=14.sp,fontWeight=if(ui.vehicle==vehicle)FontWeight.Bold else FontWeight.Medium)}}}}}
        item {GlassCard(Modifier.fillMaxWidth()) {
            if(rows.isEmpty())Note("No schedules available for this vehicle and jurisdiction. Select a different region.")
            rows.forEachIndexed { index,row ->
                if(index>0)HorizontalDivider(Modifier.padding(vertical=7.dp),color=Line)
                Row(Modifier.fillMaxWidth().clickable {vm.select(row)}.padding(vertical=8.dp),verticalAlignment=Alignment.CenterVertically){Checkbox(checked=row.key in ui.selected,onCheckedChange={vm.select(row)},colors=CheckboxDefaults.colors(checkedColor=Ink),modifier=Modifier.size(30.dp));Column(Modifier.weight(1f).padding(start=9.dp,end=10.dp)){Text(row.name,fontSize=14.sp,lineHeight=19.sp,fontWeight=FontWeight.SemiBold);Text("§${row.section}",color=Secondary,fontSize=11.sp)};Text(currency(row.amount(ui.repeated)),fontSize=16.sp,fontWeight=FontWeight.SemiBold)}
            }
            HorizontalDivider(Modifier.padding(vertical=12.dp),color=Line)
            Row(verticalAlignment=Alignment.CenterVertically){Column(Modifier.weight(1f)){Text("Repeat offence",fontSize=15.sp,fontWeight=FontWeight.SemiBold);Text("Use subsequent-offence amounts",fontSize=11.sp,color=Secondary)};Switch(checked=ui.repeated,onCheckedChange=vm::repeat,colors=SwitchDefaults.colors(checkedTrackColor=MaterialTheme.colorScheme.primary,checkedThumbColor=MaterialTheme.colorScheme.onPrimary,uncheckedTrackColor=MutedSurface,uncheckedThumbColor=Color.White,uncheckedBorderColor=Color.Transparent))}
        }}
        item {GlassCard(Modifier.fillMaxWidth(),dark=true){Caption("Dataset estimate · ${estimate.rows.size} selected",color=Color(0xFF969C9D));Spacer(Modifier.height(7.dp));Row(verticalAlignment=Alignment.CenterVertically){Text(if(estimate.rows.isEmpty())"₹—" else currency(estimate.total),Modifier.weight(1f),color=Amber,fontSize=38.sp,lineHeight=46.sp,fontFamily=FontFamily.Monospace,fontWeight=FontWeight.Bold);if(estimate.rows.isNotEmpty())Button(onClick={onExplain(estimate)},shape=CircleShape,colors=ButtonDefaults.buttonColors(containerColor=Color(0xFF303435),contentColor=DriveWhite)){Text("Explain",fontSize=12.sp,fontWeight=FontWeight.Bold);AppIcon(Glyph.Arrow,Modifier.padding(start=5.dp).size(16.dp),DriveWhite)}}
            if(estimate.missingAmounts){Spacer(Modifier.height(10.dp));Text("One or more selected amounts are unspecified; no total is shown.",color=Color(0xFFFF9B88),fontSize=12.sp)}
            val consequences=estimate.rows.mapNotNull {it.licence}.distinct()
            if(consequences.isNotEmpty()){HorizontalDivider(Modifier.padding(vertical=15.dp),color=Color(0xFF303435));consequences.forEach {Text(it,color=Color(0xFFFF8D7D),fontSize=12.sp,fontWeight=FontWeight.SemiBold)}}
        }}
        item {Note("This sums listed offence amounts, not a guaranteed payable challan. Compounding fees are separate. Missing state data is never replaced with national rates. Check the source before relying on an estimate.")}
        if(estimate.rows.isNotEmpty())item {OutlinedButton(onClick={onExport(estimate)},modifier=Modifier.fillMaxWidth()){AppIcon(Glyph.Download,Modifier.size(18.dp));Spacer(Modifier.width(8.dp));Text("Share PDF breakdown")}}
    }
}
@Composable fun AssistantScreen(ui:AppState,vm:MainViewModel,onRegion:()->Unit,onVoice:()->Unit,voiceDraft:String,onDraftConsumed:()->Unit,onSource:(String)->Unit) {
    var draft by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(voiceDraft){if(voiceDraft.isNotBlank()){draft=voiceDraft;onDraftConsumed()}}
    val scroll=androidx.compose.foundation.lazy.rememberLazyListState()
    LaunchedEffect(ui.messages.size,ui.sending){if(ui.messages.isNotEmpty())scroll.animateScrollToItem(ui.messages.size.coerceAtMost(scroll.layoutInfo.totalItemsCount-1).coerceAtLeast(0))}
    Column(Modifier.fillMaxSize().padding(top=16.dp)) {
        Column(Modifier.padding(horizontal=20.dp)){PageTitle("Assistant","Online AI with offline fallback. Not legal advice."){RoundButton(Glyph.Plus,"New conversation",vm::newChat)};Spacer(Modifier.height(15.dp));RegionChip(ui,onRegion)}
        LazyColumn(Modifier.weight(1f).fillMaxWidth(),state=scroll,contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
            if(ui.messages.isEmpty())item {Column(Modifier.padding(top=23.dp)){Box(Modifier.size(52.dp).background(BrandBlack,RoundedCornerShape(16.dp)),contentAlignment=Alignment.Center){AppIcon(Glyph.Assistant,Modifier.size(27.dp),Amber)};Spacer(Modifier.height(20.dp));Text("A little clarity\ngoes a long way.",fontSize=30.sp,lineHeight=36.sp,fontWeight=FontWeight.Bold,letterSpacing=(-.6).sp);Spacer(Modifier.height(12.dp));Text("Ask about a rule or fine. When a record is missing, I’ll tell you.",fontSize=14.sp,lineHeight=22.sp,color=Secondary);Spacer(Modifier.height(25.dp));Caption("Try asking");Spacer(Modifier.height(12.dp));listOf("Is a helmet compulsory for the pillion rider too?","What is the fine for no seat belt?","What does section 194D say?").forEach { question->Pill(question,{vm.ask(question)},modifier=Modifier.padding(bottom=8.dp))}}}
            items(ui.messages,key={it.id}) { message -> Row(Modifier.fillMaxWidth(),horizontalArrangement=if(message.user)Arrangement.End else Arrangement.Start,verticalAlignment=Alignment.Top) {
                if(!message.user){Box(Modifier.padding(end=9.dp).size(30.dp).background(BrandBlack,RoundedCornerShape(10.dp)),contentAlignment=Alignment.Center){AppIcon(Glyph.Warning,Modifier.size(16.dp),Amber)}}
                Surface(shape=RoundedCornerShape(topStart=if(message.user)25.dp else 9.dp,topEnd=25.dp,bottomStart=25.dp,bottomEnd=if(message.user)9.dp else 25.dp),color=if(message.user)BrandBlack else MaterialTheme.colorScheme.surface.copy(alpha=.92f),border=if(message.user)null else BorderStroke(1.dp,Line),modifier=Modifier.widthIn(max=620.dp)) {
                    Column(Modifier.padding(18.dp)){if(!message.user){Caption(message.mode);Spacer(Modifier.height(9.dp))};Text(message.text,fontSize=15.sp,lineHeight=24.sp,color=if(message.user)DriveWhite else Ink,fontWeight=if(message.user)FontWeight.Medium else FontWeight.Normal);if(message.citations.isNotEmpty()){Spacer(Modifier.height(15.dp));Caption("Sources");message.citations.distinct().forEach { c->TextButton(onClick={c.url?.let(onSource)},enabled=!c.url.isNullOrBlank(),contentPadding=PaddingValues(vertical=3.dp)){Text("§${c.section} · ${c.region}\n${c.source}",fontSize=11.sp,lineHeight=17.sp,color=Secondary)}}}}
                }
            }}
            if(ui.sending)item {Text("Asking the online assistant…",color=Secondary,fontSize=13.sp)}
        }
        Surface(Modifier.fillMaxWidth().padding(start=16.dp,end=16.dp,bottom=111.dp).imePadding(),shape=RoundedCornerShape(31.dp),color=MaterialTheme.colorScheme.surface.copy(alpha=.96f),border=BorderStroke(1.dp,Line),shadowElevation=5.dp){Row(Modifier.padding(7.dp),verticalAlignment=Alignment.CenterVertically){TextField(value=draft,onValueChange={draft=it.take(2000)},modifier=Modifier.weight(1f),placeholder={Text("Ask about a rule or fine",fontSize=13.sp)},maxLines=4,enabled=!ui.sending,keyboardOptions=KeyboardOptions(imeAction=ImeAction.Send),keyboardActions=KeyboardActions(onSend={if(draft.isNotBlank()){vm.ask(draft);draft=""}}),colors=TextFieldDefaults.colors(focusedContainerColor=Color.Transparent,unfocusedContainerColor=Color.Transparent,disabledContainerColor=Color.Transparent,focusedIndicatorColor=Color.Transparent,unfocusedIndicatorColor=Color.Transparent));RoundButton(Glyph.Mic,"Voice question",onVoice);Spacer(Modifier.width(6.dp));RoundButton(Glyph.Send,"Send question",{if(draft.isNotBlank()){vm.ask(draft);draft=""}},dark=true)}}
    }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun LawSheet(law:Law,saved:Boolean,onDismiss:()->Unit,onBookmark:()->Unit,onEstimate:()->Unit,onSource:(String)->Unit) {
    ModalBottomSheet(onDismissRequest=onDismiss,containerColor=Paper) {Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(start=24.dp,end=24.dp,bottom=35.dp)){
        Caption("§${law.section} · ${law.region}");Spacer(Modifier.height(12.dp));Text(law.name,fontSize=27.sp,lineHeight=33.sp,fontWeight=FontWeight.Bold);law.description?.let {Spacer(Modifier.height(10.dp));Text(it,color=Secondary,fontSize=14.sp,lineHeight=22.sp)};Spacer(Modifier.height(22.dp));GlassCard(Modifier.fillMaxWidth()){DetailRow("First offence",currency(law.first));DetailRow("Repeat offence",currency(law.repeat));DetailRow("Maximum in record",currency(law.maximum));DetailRow("Compounding fee",currency(law.compounding));DetailRow("Vehicle",law.vehicle ?: "Any vehicle");DetailRow("Imprisonment",law.imprisonment ?: "Not recorded");DetailRow("Licence",law.licence ?: "Not recorded");DetailRow("Other penalties",law.penalties ?: "Not recorded");DetailRow("Effective date",law.effective ?: "Not recorded")};Spacer(Modifier.height(18.dp));law.notes?.let {Text(it,fontSize=13.sp,lineHeight=21.sp,color=Secondary);Spacer(Modifier.height(12.dp))};TextButton(onClick={law.sourceUrl?.let(onSource)},enabled=!law.sourceUrl.isNullOrBlank()){Text(law.source ?: "Open source authority",fontSize=13.sp)};Spacer(Modifier.height(10.dp));Row(horizontalArrangement=Arrangement.spacedBy(10.dp)){OutlinedButton(onClick=onBookmark){AppIcon(Glyph.Bookmark,Modifier.size(18.dp),if(saved)Amber else Ink);Spacer(Modifier.width(6.dp));Text(if(saved)"Saved" else "Save")};AmberButton("Estimate",onEstimate)};Spacer(Modifier.height(15.dp));Note("Historical project records. An unspecified penalty is not necessarily absent. Check the source authority for current amendments.")}}
}
@Composable fun DetailRow(label:String,value:String) {Row(Modifier.fillMaxWidth().padding(vertical=9.dp),horizontalArrangement=Arrangement.spacedBy(15.dp)){Text(label,Modifier.weight(1f),fontSize=12.sp,color=Secondary);Text(value,Modifier.weight(1.25f),fontSize=12.sp,lineHeight=18.sp,fontWeight=FontWeight.Medium)};HorizontalDivider(color=Line)}
