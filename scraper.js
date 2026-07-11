const https = require('https');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnon);

const url = 'https://angelform.in/index.php?route=product/product&path=&product_id=249&cname=';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', async () => {
    const $ = cheerio.load(data);
    
    // Extract product details
    const name = $('h1.title-product').text().trim() || $('h1').first().text().trim();
    
    // Attempt to extract image
    let imageUrl = '';
    const imgEl = $('.product-info .image img').attr('src') || $('.thumbnails img').attr('src');
    if (imgEl) {
      imageUrl = imgEl;
    }
    
    // Price
    let priceText = $('.price-new').text().trim() || $('.product-info .price').text().trim();
    if (!priceText) {
      priceText = $('h2').filter((i, el) => $(el).text().includes('₹')).text().trim();
    }
    const priceMatch = priceText.match(/\d+(,\d+)*(\.\d+)?/);
    const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, ''), 10) : 0;
    
    // Sizes
    const sizes = [];
    $('select[name^="option"] option, .options .radio label, .options .checkbox label').each((i, el) => {
      const text = $(el).text().replace(/\(.*\)/, '').trim();
      if (text && text.toLowerCase() !== '--- please select ---') {
        sizes.push(text);
      }
    });

    const description = $('#tab-description').text().trim().substring(0, 500);

    console.log({ name, imageUrl, price, sizes, description });

    if (name) {
      // Find the brand Angelform
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .ilike('name', 'Angelform')
        .single();
        
      if (brand) {
        const { data: updated, error } = await supabase
          .from('products')
          .insert({
            brand_id: brand.id,
            name: name,
            image: imageUrl,
            price: price,
            description: description,
            sizes: sizes.length > 0 ? sizes : ['One Size'],
            size_type: sizes.length > 0 ? 'standard' : 'none',
            in_stock: true
          });
          
        if (error) {
          console.error('Error inserting product:', error);
        } else {
          console.log('Product added successfully!');
        }
      }
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
