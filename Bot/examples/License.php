function checkLicense($license, $product, $version) {
    $url = 'http://<your_ip>:<port>/api/client';
    $apiKey = 'API_KEY';

    $data = array(
        'license' => $license,
        'product' => $product,
        'version' => $version,
    );

    $headers = array(
        'Authorization: ' . $apiKey,
    );

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    $responseData = json_decode($response, true);

    if ($responseData['status_overview'] !== 'success' && $responseData['status_code'] !== 200) {
        return false;
    }

    return $responseData;
}
