package com.drivelegal.app

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.drivelegal.app.data.Account
import com.drivelegal.app.ui.DriveLegalTheme
import com.drivelegal.app.ui.SettingsDialog
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*

class SettingsTest {
    @get:Rule val rule=createComposeRule()
    @Test fun signedInProfileHasLogoutBelowBothToggles() {
        var loggedOut=false
        rule.setContent {DriveLegalTheme(dark=true) {
            SettingsDialog(AppState(account=Account("test","Test Driver","test@example.invalid")),{}, {}, {}, {loggedOut=true}, {_,_,_->})
        }}
        rule.onNodeWithText("Name (optional)").assertDoesNotExist()
        rule.onNodeWithText("Manage Firebase account").assertDoesNotExist()
        val dark=rule.onNodeWithContentDescription("App-wide dark mode").fetchSemanticsNode().boundsInRoot
        val low=rule.onNodeWithContentDescription("Low-power drive mode").fetchSemanticsNode().boundsInRoot
        val logout=rule.onNodeWithText("Log out").fetchSemanticsNode().boundsInRoot
        assertTrue(logout.top>dark.bottom);assertTrue(logout.top>low.bottom)
        rule.onNodeWithText("Log out").performClick()
        rule.runOnIdle {assertTrue(loggedOut)}
    }
}
