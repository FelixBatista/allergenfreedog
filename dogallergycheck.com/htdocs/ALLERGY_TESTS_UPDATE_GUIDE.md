# Dog Allergy Tests Page - Update Guide

## Quick Updates

### To Update Coupons:
1. Open `htdocs/config/allergy-tests-config.js`
2. Find the `coupons` section
3. Update the `code`, `discount`, or `description` for any test
4. Save the file

### To Update Test Information:
1. Open `htdocs/config/allergy-tests-config.js`
2. Find the `tests` section
3. Update any test details like:
   - `name` - Test name
   - `rating` - Star rating (4.0-5.0)
   - `itemsTested` - Number of items tested
   - `sampleType` - Hair, Saliva, Cheek Swab
   - `resultsTime` - How long for results
   - `priceRange` - Price range
   - `description` - Test description
   - `features` - Array of features
   - `url` - Affiliate/partner link
   - `badge` - Badge text (e.g., "#1 Most Popular")
   - `featured` - true/false for featured styling

### To Update Statistics:
1. Open `htdocs/config/allergy-tests-config.js`
2. Find the `stats` section
3. Update the numbers and descriptions

### To Update FAQs:
1. Open `htdocs/config/allergy-tests-config.js`
2. Find the `faqs` section
3. Add, remove, or modify questions and answers

## Current Test Configuration

### Featured Tests (in order):
1. **UCARI** - #1 Most Popular (4.9/5 stars)
2. **My Pet Health Store** - Outstanding (4.8/5 stars)  
3. **5Strands** - Outstanding (4.9/5 stars)
4. **Easy DNA** - Outstanding (4.8/5 stars)

### Current Coupons:
- UCARI: HEALTHY15 (15% Off)
- My Pet Health Store: HEALTHY2025 (10% Off)
- 5Strands: HEALTHYHAIR (10% Off)
- Easy DNA: ITOLOFF10 (10% Off)
- Nutriscan: NUTRISCAN10OFF (10% Off)

## File Structure
- `htdocs/dog-allergy-tests.html` - Main page
- `htdocs/config/allergy-tests-config.js` - Configuration file
- `htdocs/ALLERGY_TESTS_UPDATE_GUIDE.md` - This guide

## Notes
- The page is fully responsive and matches your site's design
- All links open in new tabs for better user experience
- The configuration file makes updates easy without touching HTML
- You can add/remove tests by modifying the config file
