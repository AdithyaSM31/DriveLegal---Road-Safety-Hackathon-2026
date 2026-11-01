package com.drivelegal.app.data

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.drivelegal.app.R
import com.google.android.gms.tasks.Task
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class Account(val uid:String,val name:String?,val email:String?,val photoUrl:String?=null)
private suspend fun <T> Task<T>.awaitResult():T = suspendCancellableCoroutine { continuation ->
    addOnSuccessListener { if(continuation.isActive) continuation.resume(it) }
    addOnFailureListener { if(continuation.isActive) continuation.resumeWithException(it) }
    addOnCanceledListener { continuation.cancel() }
}
class AuthRepository(private val context:Context) {
    private val auth=FirebaseAuth.getInstance()
    private val credentials=CredentialManager.create(context)
    private val _account=MutableStateFlow(auth.currentUser?.let {Account(it.uid,it.displayName,it.email,it.photoUrl?.toString())})
    val account=_account.asStateFlow()
    private val listener=FirebaseAuth.AuthStateListener { firebase -> _account.value=firebase.currentUser?.let {Account(it.uid,it.displayName,it.email,it.photoUrl?.toString())} }
    init {auth.addAuthStateListener(listener)}
    suspend fun google(activity:Activity) {
        val option=GetSignInWithGoogleOption.Builder(context.getString(R.string.default_web_client_id)).setNonce(UUID.randomUUID().toString()).build()
        val request=GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential=credentials.getCredential(activity,request).credential
        check(credential is CustomCredential && credential.type==GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {"Google did not return a supported sign-in credential."}
        val token=GoogleIdTokenCredential.createFrom(credential.data).idToken
        auth.signInWithCredential(GoogleAuthProvider.getCredential(token,null)).awaitResult()
    }
    suspend fun email(email:String,password:String,create:Boolean=false) {
        if(create)auth.createUserWithEmailAndPassword(email.trim(),password).awaitResult()
        else auth.signInWithEmailAndPassword(email.trim(),password).awaitResult()
    }
    suspend fun reset(email:String) {auth.sendPasswordResetEmail(email.trim()).awaitResult()}
    suspend fun signOut() {
        auth.signOut()
        runCatching {credentials.clearCredentialState(ClearCredentialStateRequest())}
    }
    fun close(){auth.removeAuthStateListener(listener)}
}
