package com.drivelegal.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.drivelegal.app.R

@Composable fun BrandLogo(size:Dp=48.dp) {Image(painterResource(R.drawable.brand_motion_d),"DriveLegal Motion D logo",Modifier.size(size).clip(RoundedCornerShape(size*.23f)))}
