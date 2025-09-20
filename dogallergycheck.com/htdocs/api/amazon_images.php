<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get ASIN from request
$asin = $_GET['asin'] ?? '';

if (empty($asin)) {
    http_response_code(400);
    echo json_encode(['error' => 'ASIN parameter is required']);
    exit();
}

// Validate ASIN format (Amazon ASINs are 10 characters)
if (strlen($asin) !== 10) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid ASIN format']);
    exit();
}

// Function to check if image URL exists
function checkImageExists($url) {
    $headers = @get_headers($url, 1);
    if ($headers && strpos($headers[0], '200') !== false) {
        return true;
    }
    return false;
}

// Function to get image from Amazon using multiple patterns
function getAmazonImage($asin) {
    // Try different Amazon image URL patterns
    $patterns = [
        "https://m.media-amazon.com/images/I/{$asin}._AC_SX679_.jpg",
        "https://m.media-amazon.com/images/I/{$asin}._AC_SL1500_.jpg", 
        "https://m.media-amazon.com/images/I/{$asin}._AC_SX679_.jpg",
        "https://images-na.ssl-images-amazon.com/images/I/{$asin}._AC_SX679_.jpg",
        "https://m.media-amazon.com/images/I/{$asin}._AC_SL1000_.jpg",
        "https://m.media-amazon.com/images/I/{$asin}._AC_SL1500_.jpg"
    ];
    
    foreach ($patterns as $url) {
        if (checkImageExists($url)) {
            return $url;
        }
    }
    
    return null;
}

// Try to get the image
$imageUrl = getAmazonImage($asin);

if ($imageUrl) {
    echo json_encode([
        'success' => true,
        'image' => $imageUrl,
        'source' => 'amazon_direct'
    ]);
} else {
    // If no Amazon image found, return failure
    echo json_encode([
        'success' => false,
        'error' => 'No image found for this ASIN',
        'asin' => $asin
    ]);
}
?>
