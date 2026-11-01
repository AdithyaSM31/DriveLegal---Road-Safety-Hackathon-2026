package com.drivelegal.app

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Rule
import org.junit.Test
import java.io.File

class AppFlowTest {
    @get:Rule val rule=createAndroidComposeRule<MainActivity>()
    private fun ready(){
        rule.waitUntil(15000){rule.onAllNodesWithText("Ready for the road?").fetchSemanticsNodes().isNotEmpty() || rule.onAllNodesWithText("Browse offline as guest").fetchSemanticsNodes().isNotEmpty()}
        if(rule.onAllNodesWithText("Browse offline as guest").fetchSemanticsNodes().isNotEmpty())rule.onNodeWithText("Browse offline as guest").performClick()
        rule.waitUntil(15000){rule.onAllNodesWithText("Ready for the road?").fetchSemanticsNodes().isNotEmpty()}
    }
    private fun capture(name:String){rule.mainClock.advanceTimeBy(400);rule.waitForIdle();val directory=File(rule.activity.getExternalFilesDir(null),"screenshots").apply {mkdirs()};File(directory,"$name.png").outputStream().use {androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot().compress(Bitmap.CompressFormat.PNG,100,it)}}
    @Test fun fiveScreensAndSimulationWorkWithoutNetworkOrGpsPermission(){
        ready();capture("01-home")
        rule.onNodeWithContentDescription("Laws tab").performClick();rule.onNodeWithText("Traffic laws").assertIsDisplayed();capture("02-laws")
        rule.onNodeWithContentDescription("Fines tab").performClick();rule.onNodeWithText("Fine calculator").assertIsDisplayed();capture("03-fines")
        rule.onNodeWithContentDescription("Assistant tab").performClick();rule.onNodeWithText("Online AI with offline fallback. Not legal advice.").assertIsDisplayed();capture("04-assistant")
        rule.onNodeWithContentDescription("Home tab").performClick();rule.onNodeWithContentDescription("Simulation").performClick()
        rule.onNodeWithContentDescription("Drive tab").performClick();rule.onNodeWithText("Drive mode").assertIsDisplayed()
        rule.onNodeWithContentDescription("Set posted speed limit").performClick();rule.onNodeWithText("km/h").performTextInput("30");rule.onNodeWithText("Use this limit").performClick()
        rule.onNode(hasScrollAction()).performScrollToNode(hasContentDescription("Demo speed"))
        rule.onNodeWithContentDescription("Demo speed").performSemanticsAction(SemanticsActions.SetProgress){it(34f)}
        rule.onNode(hasScrollAction()).performScrollToIndex(0);capture("05-drive")
        rule.onNodeWithText("Slow down — 4 km/h over").assertExists()
        rule.onNodeWithText("End drive").assertIsDisplayed().performClick();rule.onNodeWithText("Ready for the road?").assertExists()
    }
    @Test fun nativePdfExportProducesReadablePages() {
        ready()
        val snapshot=com.drivelegal.app.data.Snapshot.parse(rule.activity.assets.open("snapshot.json").bufferedReader().use {it.readText()})
        val rows=com.drivelegal.app.data.calculatorRows(snapshot.laws,snapshot.regions.first {it.name=="Maharashtra"}.id,"Car")
        val uri=com.drivelegal.app.data.NativeReport.create(rule.activity,com.drivelegal.app.data.Estimate(rows,true))
        val folder=File(rule.activity.getExternalFilesDir(null),"screenshots").apply {mkdirs()}
        rule.activity.contentResolver.openInputStream(uri)!!.use {input->File(folder,"estimate.pdf").outputStream().use {output->input.copyTo(output)}}
        val descriptor=rule.activity.contentResolver.openFileDescriptor(uri,"r")!!
        android.graphics.pdf.PdfRenderer(descriptor).use {renderer->
            org.junit.Assert.assertTrue(renderer.pageCount>=2)
            renderer.openPage(0).use {page->
                val bitmap=Bitmap.createBitmap(595,842,Bitmap.Config.ARGB_8888)
                bitmap.eraseColor(android.graphics.Color.WHITE)
                page.render(bitmap,null,null,android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                File(folder,"06-pdf.png").outputStream().use {bitmap.compress(Bitmap.CompressFormat.PNG,100,it)}
            }
        }
    }

    @Test fun accountScreenAndSavedDarkModeWorkAcrossTheApp() {
        ready()
        val vm=androidx.lifecycle.ViewModelProvider(rule.activity)[MainViewModel::class.java]
        rule.onNodeWithContentDescription("Profile and settings").performClick()
        rule.onNodeWithContentDescription("App-wide dark mode").performClick()
        rule.onNodeWithText("Save",useUnmergedTree=true).performClick()
        org.junit.Assert.assertTrue(vm.repository.darkMode)
        capture("07-home-dark")
        rule.onNodeWithContentDescription("Laws tab").performClick();capture("08-laws-dark")
        rule.onNodeWithContentDescription("Fines tab").performClick();capture("09-fines-dark")
        rule.onNodeWithContentDescription("Assistant tab").performClick();capture("10-assistant-dark")
        rule.runOnIdle {vm.signOut()}
        rule.waitUntil(15000){rule.onAllNodesWithText("Continue with Google").fetchSemanticsNodes().isNotEmpty()}
        rule.onNodeWithText("Continue with Google").assertIsDisplayed()
        capture("11-signin-dark")
        rule.onNodeWithContentDescription("App-wide dark mode").performClick()
        capture("12-signin-light")
        rule.onNodeWithText("Use email and password").performClick()
        rule.onNodeWithText("Email",useUnmergedTree=true).assertExists()
        rule.onNodeWithText("Password",useUnmergedTree=true).assertExists()
        rule.onNodeWithText("Browse offline as guest").performClick()
        capture("01-home")
    }
    @Test fun brandArtworkRendersAtLauncherAndStoreSizes() {
        ready()
        val bitmap=Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888)
        val canvas=android.graphics.Canvas(bitmap)
        val outline=android.graphics.Path().apply {addRoundRect(0f,0f,512f,512f,112f,112f,android.graphics.Path.Direction.CW)}
        canvas.clipPath(outline)
        val drawable=androidx.core.content.ContextCompat.getDrawable(rule.activity,R.drawable.brand_motion_d)!!
        drawable.setBounds(0,0,512,512);drawable.draw(canvas)
        val directory=File(rule.activity.getExternalFilesDir(null),"screenshots").apply {mkdirs()}
        File(directory,"drivelegal-logo.png").outputStream().use {bitmap.compress(Bitmap.CompressFormat.PNG,100,it)}
        org.junit.Assert.assertNotNull(androidx.core.content.ContextCompat.getDrawable(rule.activity,R.mipmap.ic_launcher))
    }

    @Test fun mapOpensInsideAppAndSettingsAreSimplified() {
        ready()
        rule.onNodeWithText("Open map").performClick()
        rule.onNodeWithText("Road map").assertIsDisplayed()
        rule.onNodeWithText("Refresh cameras").assertIsDisplayed()
        rule.waitUntil(45000){rule.onAllNodesWithText("Loading map tiles…").fetchSemanticsNodes().isEmpty()}
        rule.onNodeWithText("Map tiles are taking longer. Check your connection.").assertDoesNotExist()
        capture("13-road-map")
        rule.onNodeWithText("Back").performClick()
        rule.onNodeWithContentDescription("Profile and settings").performClick()
        rule.onNodeWithText("Name (optional)").assertDoesNotExist()
        rule.onNodeWithText("Manage Firebase account").assertDoesNotExist()
        rule.onNodeWithContentDescription("App-wide dark mode").assertIsDisplayed()
        rule.onNodeWithContentDescription("Low-power drive mode").assertIsDisplayed()
        capture("14-profile-settings")
        rule.onNodeWithText("Cancel").performClick()
    }
}
