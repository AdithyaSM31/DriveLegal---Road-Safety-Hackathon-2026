package com.drivelegal.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.drivelegal.app.AppState
import com.drivelegal.app.MainViewModel
import com.drivelegal.app.R

@Composable fun AuthFields(ui:AppState,vm:MainViewModel,onGoogle:()->Unit,compact:Boolean=false) {
    var email by rememberSaveable {mutableStateOf("")}
    // Passwords intentionally never enter saved-instance state or preferences.
    var password by remember {mutableStateOf("")}
    var create by rememberSaveable {mutableStateOf(false)}
    var emailOpen by rememberSaveable {mutableStateOf(false)}
    var validation by remember {mutableStateOf<String?>(null)}
    fun validEmail()=android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()
    Column(verticalArrangement=Arrangement.spacedBy(13.dp)) {
        Button(onClick=onGoogle,enabled=!ui.authBusy,modifier=Modifier.fillMaxWidth().heightIn(min=54.dp),shape=CircleShape,colors=ButtonDefaults.buttonColors(containerColor=Color.White,contentColor=BrandBlack),border=androidx.compose.foundation.BorderStroke(1.dp,Line)) {
            Image(painterResource(R.drawable.google_signin),null,Modifier.size(22.dp));Spacer(Modifier.width(12.dp));Text("Continue with Google",fontSize=15.sp,fontWeight=FontWeight.SemiBold)
        }
        if(!emailOpen)OutlinedButton(onClick={emailOpen=true},modifier=Modifier.fillMaxWidth().heightIn(min=50.dp),enabled=!ui.authBusy,shape=CircleShape){Text("Use email and password")}
        if(emailOpen) {
            OutlinedTextField(email,{email=it;validation=null},modifier=Modifier.fillMaxWidth(),label={Text("Email")},singleLine=true,enabled=!ui.authBusy,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Email))
            OutlinedTextField(password,{password=it;validation=null},modifier=Modifier.fillMaxWidth(),label={Text("Password")},singleLine=true,enabled=!ui.authBusy,visualTransformation=PasswordVisualTransformation(),keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Password))
            Button(onClick={if(!validEmail())validation="Enter a valid email address." else if(password.length<6)validation="Enter a password of at least 6 characters." else {vm.email(email,password,create);password=""}},enabled=!ui.authBusy,modifier=Modifier.fillMaxWidth().heightIn(min=48.dp),shape=CircleShape){Text(if(create)"Create account" else "Sign in")}
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){TextButton(onClick={create=!create;validation=null},enabled=!ui.authBusy){Text(if(create)"Use existing account" else "Create account",fontSize=11.sp)};TextButton(onClick={if(validEmail())vm.resetPassword(email) else validation="Enter your email first."},enabled=!ui.authBusy){Text("Reset password",fontSize=11.sp)}}
        }
        (validation ?: ui.authError)?.let {Text(it,color=MaterialTheme.colorScheme.error,fontSize=12.sp,lineHeight=18.sp)}
        if(ui.authBusy)Row(verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(Modifier.size(17.dp),strokeWidth=2.dp);Spacer(Modifier.width(10.dp));Text("Connecting securely…",fontSize=12.sp,color=Secondary)}
        if(!compact)Note("Uses the same DriveLegal Firebase project. Your Google password is never entered into DriveLegal. Existing Firebase accounts are supported.")
    }
}
@Composable fun SignInScreen(ui:AppState,vm:MainViewModel,onGoogle:()->Unit,modifier:Modifier=Modifier) {
    Column(modifier.verticalScroll(rememberScrollState()).padding(26.dp),verticalArrangement=Arrangement.spacedBy(25.dp)) {
        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){BrandLogo(60.dp);Row(verticalAlignment=Alignment.CenterVertically){Text("Dark mode",fontSize=12.sp,color=Secondary);Switch(ui.darkMode,vm::darkMode,Modifier.padding(start=8.dp).semantics {contentDescription="App-wide dark mode"})}}
        Spacer(Modifier.height(18.dp))
        Column {Caption("KNOW THE ROAD. OWN THE JOURNEY.");Spacer(Modifier.height(14.dp));Text("A little knowledge.\nA safer journey.",fontSize=36.sp,lineHeight=42.sp,fontWeight=FontWeight.Bold,letterSpacing=(-1).sp);Spacer(Modifier.height(15.dp));Text("Your traffic laws, fine estimates, and road companion. Sign in to DriveLegal.",fontSize=15.sp,lineHeight=24.sp,color=Secondary)}
        GlassCard(Modifier.fillMaxWidth()) {AuthFields(ui,vm,onGoogle)}
        TextButton(onClick=vm::browseOffline,enabled=!ui.authBusy,modifier=Modifier.align(Alignment.CenterHorizontally)){Text("Browse offline as guest",color=Secondary)}
        Note("Law records are available offline. Sign-in needs an internet connection. Bookmarks are stored on this device and are not synced to Firebase.")
    }
}
@Composable fun AccountDialog(ui:AppState,vm:MainViewModel,onGoogle:()->Unit,onDismiss:()->Unit) {
    var signingIn by remember {mutableStateOf(false)}
    LaunchedEffect(ui.account){if(signingIn && ui.account!=null)onDismiss()}
    AlertDialog(onDismissRequest=onDismiss,title={Text(if(ui.account==null)"Your Firebase account" else "You're signed in")},text={Column(Modifier.heightIn(max=500.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(16.dp)){
        if(ui.account!=null){Text(ui.account.name ?: "DriveLegal account",fontWeight=FontWeight.Bold);ui.account.email?.let {Text(it,color=Secondary)};Note("Signed in through Firebase Authentication. Saved laws remain on this device.")}
        else AuthFields(ui,vm,{signingIn=true;onGoogle()},compact=true)
    }},confirmButton={TextButton(onClick=onDismiss){Text("Done")}},dismissButton={if(ui.account!=null)TextButton(onClick={vm.signOut();onDismiss()}){Text("Sign out")}},containerColor=Paper)
}
