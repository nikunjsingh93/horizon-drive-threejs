Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\public'
foreach ($size in @(180, 192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.ScaleTransform($size / 512, $size / 512)

    $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#263436'))
    $sky = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7798a0'))
    $farHill = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7c9a80'))
    $nearHill = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#425e4b'))
    $road = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#353c3a'))
    $marking = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e2e6d7'))
    $sun = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e4e1b4'))

    $graphics.FillRectangle($background, 0, 0, 512, 512)
    $graphics.FillRectangle($sky, 76, 76, 360, 235)
    $graphics.FillEllipse($sun, 345, 116, 52, 52)
    $graphics.FillPolygon($farHill, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(76, 274), [System.Drawing.Point]::new(166, 207),
        [System.Drawing.Point]::new(240, 265), [System.Drawing.Point]::new(311, 224),
        [System.Drawing.Point]::new(436, 283), [System.Drawing.Point]::new(436, 359),
        [System.Drawing.Point]::new(76, 359)))
    $graphics.FillPolygon($nearHill, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(76, 309), [System.Drawing.Point]::new(171, 270),
        [System.Drawing.Point]::new(246, 308), [System.Drawing.Point]::new(343, 265),
        [System.Drawing.Point]::new(436, 301), [System.Drawing.Point]::new(436, 436),
        [System.Drawing.Point]::new(76, 436)))
    $graphics.FillPolygon($road, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(237, 298), [System.Drawing.Point]::new(275, 298),
        [System.Drawing.Point]::new(373, 436), [System.Drawing.Point]::new(139, 436)))
    $graphics.FillPolygon($marking, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(253, 319), [System.Drawing.Point]::new(259, 319),
        [System.Drawing.Point]::new(262, 341), [System.Drawing.Point]::new(251, 341)))
    $graphics.FillPolygon($marking, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(250, 360), [System.Drawing.Point]::new(263, 360),
        [System.Drawing.Point]::new(269, 398), [System.Drawing.Point]::new(244, 398)))

    $graphics.Dispose()
    $bitmap.Save((Join-Path $outputDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    foreach ($brush in @($background, $sky, $farHill, $nearHill, $road, $marking, $sun)) { $brush.Dispose() }
}
