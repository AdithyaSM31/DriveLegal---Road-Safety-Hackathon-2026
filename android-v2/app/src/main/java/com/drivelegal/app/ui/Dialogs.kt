package com.drivelegal.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.drivelegal.app.AppState

@Composable fun SettingsDialog(ui:AppState,onDismiss:()->Unit,onDarkMode:(Boolean)->Unit,onAccount:()->Unit,onLogout:()->Unit,onSave:(String,String,Boolean)->Unit) {
    var backend by remember {mutableStateOf(ui.backend)}
    var low by remember {mutableStateOf(ui.lowPower)}
    var advanced by remember {mutableStateOf(false)}
    AlertDialog(onDismissRequest=onDismiss,title={Text("Your account")},text={Column(Modifier.heightIn(max=490.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(18.dp)){
        Note(if(ui.account!=null) "Signed in as ${ui.account.email ?: ui.account.name.orEmpty()}" else "Browsing as a guest.")
        Row(verticalAlignment=androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f)){Text("Dark mode",fontWeight=FontWeight.SemiBold);Text("Applies across the app and stays saved.",fontSize=12.sp,color=Secondary)}
            Switch(checked=ui.darkMode,onCheckedChange=onDarkMode,modifier=Modifier.semantics {contentDescription="App-wide dark mode"})
        }
        Row(verticalAlignment=androidx.compose.ui.Alignment.CenterVertically) {Column(Modifier.weight(1f)){Text("Low-power drive",fontWeight=FontWeight.SemiBold);Text("Location updates every 5 seconds while open.",fontSize=12.sp,color=Secondary,lineHeight=18.sp)};Switch(low,{low=it},modifier=Modifier.semantics {contentDescription="Low-power drive mode"})}
        if(ui.account!=null) OutlinedButton(onClick=onLogout,modifier=Modifier.fillMaxWidth()){Text("Log out",color=MaterialTheme.colorScheme.error)}
        else TextButton(onClick=onAccount){Text("Sign in with Google or email")}
        HorizontalDivider(color=Line)
        TextButton(onClick={advanced=!advanced}){Text(if(advanced)"Hide connection settings" else "Connection settings")}
        if(advanced) {
            OutlinedTextField(backend,{backend=it},label={Text("Backend URL")},modifier=Modifier.fillMaxWidth(),keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Uri),maxLines=3)
            Note("HTTPS only. API keys stay on the server.")
        }
    }},confirmButton={TextButton(onClick={onSave(ui.name,backend,low)}){Text("Save")}},dismissButton={TextButton(onClick=onDismiss){Text("Cancel")}},containerColor=Paper)
}
@Composable fun LimitDialog(current:Int?,onDismiss:()->Unit,onSave:(Int?)->Unit) {
    var value by remember {mutableStateOf(current?.toString() ?: "")}
    var invalid by remember {mutableStateOf(false)}
    AlertDialog(onDismissRequest=onDismiss,title={Text("Enter the posted limit")},text={Column(verticalArrangement=Arrangement.spacedBy(14.dp)){Text("Use the speed limit you see on the road sign. Mapped limits load automatically when available. Enter a road sign limit to override the map.",fontSize=13.sp,lineHeight=20.sp);OutlinedTextField(value,{value=it.filter(Char::isDigit).take(3);invalid=false},label={Text("km/h")},singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number),isError=invalid,supportingText={if(invalid)Text("Enter a value from 5 to 200 km/h.")})}},confirmButton={TextButton(onClick={val number=value.toIntOrNull();if(number!=null && number in 5..200)onSave(number) else invalid=true}){Text("Use this limit")}},dismissButton={TextButton(onClick={onSave(null)}){Text("Use automatic map limit")}},containerColor=Paper)
}
@Composable fun CoverageDialog(ui:AppState,onDismiss:()->Unit,onSync:()->Unit,onCheck:()->Unit,onRegion:()->Unit) {
    val snapshot=ui.snapshot
    AlertDialog(onDismissRequest=onDismiss,title={Text("Data & coverage")},text={Column(Modifier.heightIn(max=460.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(14.dp)){
        Text("${snapshot?.laws?.size ?: 0} fine schedules · ${snapshot?.regions?.size ?: 0} jurisdictions",fontWeight=FontWeight.Bold)
        Text("These are the project's existing records, with historical source dates. Coverage varies by state. They have not been independently verified as current law.",fontSize=13.sp,lineHeight=20.sp)
        snapshot?.regions?.forEach { region->val count=snapshot.laws.filter {it.regionId==region.id}.map {it.violationId}.distinct().size;Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(region.name,fontSize=12.sp);Text("$count violation types",fontSize=12.sp,color=Secondary)}}
        HorizontalDivider();Note("Backend: ${ui.backend}")
        ui.backendStatus?.let {Text(it,fontSize=12.sp,color=Secondary)}
        TextButton(onClick=onCheck,enabled=!ui.checkingBackend){Text(if(ui.checkingBackend)"Checking…" else "Check Render connection")}
        Note("Last sync: ${snapshot?.syncedAt ?: "Included offline snapshot"}")
        Note("There is no live traffic provider. Nearby cameras are an incomplete map dataset; weather and mapped limits refresh automatically with foreground location.")
        TextButton(onClick=onRegion){Text("Change jurisdiction")}
    }},confirmButton={TextButton(onClick=onSync,enabled=!ui.syncing){Text(if(ui.syncing)"Syncing…" else "Sync library")}},dismissButton={TextButton(onClick=onDismiss){Text("Close")}},containerColor=Paper)
}
