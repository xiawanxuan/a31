$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
Write-Host 'Server running at http://localhost:8080'

$mimeTypes = @{
    '.js' = 'application/javascript'
    '.mjs' = 'application/javascript'
    '.html' = 'text/html'
    '.css' = 'text/css'
    '.json' = 'application/json'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.svg' = 'image/svg+xml'
    '.ico' = 'image/x-icon'
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.LocalPath
    
    if ($path -eq '/') {
        $path = '/index.html'
    }
    
    $filePath = Join-Path 'd:\trae3\a31\astronomy-fenye' $path.TrimStart('/')
    
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $response.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        Write-Host "Serving $path as $($response.ContentType)"
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        Write-Host "404: $path"
        $response.StatusCode = 404
    }
    
    $response.Close()
}
