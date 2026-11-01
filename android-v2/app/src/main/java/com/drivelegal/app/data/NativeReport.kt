package com.drivelegal.app.data

import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

object NativeReport {
    fun create(context:Context,estimate:Estimate):Uri {
        val document=PdfDocument()
        val paint=Paint(Paint.ANTI_ALIAS_FLAG)
        var pageNumber=0
        var page:PdfDocument.Page?=null
        var y=0f
        fun newPage() {
            page?.let { document.finishPage(it) }
            pageNumber++
            page=document.startPage(PdfDocument.PageInfo.Builder(595,842,pageNumber).create())
            val canvas=page!!.canvas
            paint.color=android.graphics.Color.rgb(17,19,19);canvas.drawRect(0f,0f,595f,75f,paint)
            paint.color=android.graphics.Color.rgb(255,184,0);paint.textSize=23f;paint.typeface=Typeface.create("sans-serif",Typeface.BOLD);canvas.drawText("DriveLegal",32f,39f,paint)
            paint.color=android.graphics.Color.WHITE;paint.textSize=10f;paint.typeface=Typeface.DEFAULT;canvas.drawText("Fine estimate · supplied dataset",32f,58f,paint)
            y=103f
        }
        fun line(text:String,bold:Boolean=false) {
            paint.textSize=11f;paint.typeface=if(bold)Typeface.DEFAULT_BOLD else Typeface.DEFAULT;paint.color=android.graphics.Color.rgb(35,40,38)
            for(paragraph in text.split('\n')) {
                var current=""
                for(word in paragraph.split(' ')) {
                    val candidate=if(current.isEmpty())word else "$current $word"
                    if(paint.measureText(candidate)>523f && current.isNotEmpty()) {
                        if(y>782){newPage();paint.textSize=11f;paint.typeface=if(bold)Typeface.DEFAULT_BOLD else Typeface.DEFAULT;paint.color=android.graphics.Color.rgb(35,40,38)}
                        page!!.canvas.drawText(current,32f,y,paint);y+=17f;current=word
                    } else current=candidate
                }
                if(y>782){newPage();paint.textSize=11f;paint.typeface=if(bold)Typeface.DEFAULT_BOLD else Typeface.DEFAULT;paint.color=android.graphics.Color.rgb(35,40,38)}
                page!!.canvas.drawText(current,32f,y,paint);y+=17f
            }
        }
        try {
            newPage()
            line("${if(estimate.repeated)"Repeat" else "First"} offence estimate: ${currency(estimate.total)}",true)
            line("${estimate.rows.size} selected records. Not a guaranteed payable challan.")
            line("Compounding fees are separate and are not automatically added. Current amendments have not been independently verified.")
            y+=14f
            estimate.rows.forEachIndexed { index,law ->
                line("${index+1}. ${law.name}",true)
                line("${law.region} · Section ${law.section} · ${law.vehicle ?: "Any vehicle"}")
                line("Selected amount: ${currency(law.amount(estimate.repeated))}")
                line("First: ${currency(law.first)} | Repeat: ${currency(law.repeat)} | Maximum in record: ${currency(law.maximum)}")
                line("Compounding: ${currency(law.compounding)}")
                line("Imprisonment: ${law.imprisonment ?: "Not specified"}")
                line("Licence: ${law.licence ?: "Not specified"}")
                line("Other penalties: ${law.penalties ?: "Not specified"}")
                law.notes?.let {line(it)}
                line("Effective: ${law.effective ?: "Not recorded"}")
                line("Source: ${law.source ?: "Not recorded"}")
                line(law.sourceUrl ?: "Source URL not recorded")
                y+=18f
            }
            page?.let {document.finishPage(it)};page=null
            val directory=File(context.cacheDir,"reports").apply {mkdirs()}
            val file=File(directory,"DriveLegal-Fine-Estimate.pdf")
            file.outputStream().use {document.writeTo(it)}
            return FileProvider.getUriForFile(context,"${context.packageName}.files",file)
        } finally {document.close()}
    }
}
