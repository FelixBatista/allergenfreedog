# Amazon Product Advertising API Setup

This document explains how to set up Amazon's Product Advertising API (PA-API) for fetching product images and details.

## Current Implementation

The current system uses a **fallback approach** that tries multiple Amazon image URL patterns directly. This works for many products but may not be 100% reliable.

## Setting Up Amazon PA-API (Recommended)

For the most reliable image fetching, you should set up Amazon's official Product Advertising API.

### Step 1: Get Amazon Associates Account

1. Go to [Amazon Associates](https://affiliate-program.amazon.com/)
2. Sign up for an Associates account
3. Get approved (this can take a few days)

### Step 2: Apply for PA-API Access

1. Go to [Amazon Product Advertising API](https://webservices.amazon.com/paapi5/documentation/)
2. Click "Register for Product Advertising API"
3. Fill out the application form
4. Wait for approval (can take several weeks)

### Step 3: Get API Credentials

1. Once approved, go to [Amazon Developer Console](https://developer.amazon.com/)
2. Create a new security profile
3. Get your Access Key and Secret Key
4. Update `htdocs/config/amazon_paapi.php` with your credentials

### Step 4: Update the API

Once you have PA-API credentials, you can enhance `htdocs/api/amazon_images.php` to use the official API instead of the fallback method.

## Current Fallback Method

The current implementation tries these Amazon image URL patterns:

1. `https://m.media-amazon.com/images/I/{ASIN}._AC_SX679_.jpg`
2. `https://m.media-amazon.com/images/I/{ASIN}._AC_SL1500_.jpg`
3. `https://images-na.ssl-images-amazon.com/images/I/{ASIN}._AC_SX679_.jpg`
4. `https://m.media-amazon.com/images/I/{ASIN}._AC_SL1000_.jpg`

## Testing

To test the current implementation:

1. Open browser developer tools
2. Go to the Network tab
3. Load a comparison with products that have ASINs
4. Look for requests to `api/amazon_images.php?asin=...`
5. Check the response to see if images are found

## Troubleshooting

- **No images loading**: Check if the ASINs are valid and the products exist on Amazon
- **CORS errors**: Make sure the PHP script has proper CORS headers
- **Server errors**: Check PHP error logs for any issues

## Future Enhancements

Once PA-API is set up, you can:

1. Get higher quality images
2. Fetch additional product details
3. Get real-time pricing information
4. Access more product metadata

## References

- [Amazon PA-API Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [SearchItems Operation](https://webservices.amazon.com/paapi5/documentation/search-items.html)
- [Images Resource](https://webservices.amazon.com/paapi5/documentation/images.html)
