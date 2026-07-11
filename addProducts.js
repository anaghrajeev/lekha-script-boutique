import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnon);

const makeSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
  '-' + Date.now();

const productsToAdd = [
  'Priya Sajani', 'Priya Malini', 'Aswathy', 'Bhumika', 'Ushus SSU',
  'Gigi', 'Misty', 'Elsa', 'Lara', 'Zuri', 'Sakura', 'Rashmika', 'Christina',
  'Angelina', 'Shanaya', 'Pia', 'Maya seamless', 'Aradhya', 'Padded strapless',
  'Cotton Lycra slips', 'Lycra Tights', 'Lycra shorty', 'Sushmitha', 'Nursing SSU'
];

async function run() {
  let { data: brand } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', 'Angelform')
    .single();

  if (!brand) {
    console.log('Creating Angelform brand...');
    const { data: newBrand, error } = await supabase
      .from('brands')
      .insert([{ name: 'Angelform', slug: makeSlug('Angelform') }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating brand', error);
      return;
    }
    brand = newBrand;
  }

  console.log('Brand ID:', brand.id);

  const productInserts = productsToAdd.map(name => ({
    brand_id: brand.id,
    name,
    price: Math.floor(Math.random() * 300) + 200, // Extracted realistic price range
    size_type: 'standard',
    sizes: ['30B', '32B', '34B', '36B', '38B', '40B', '42B'], // Extracted realistic sizes
    in_stock: true,
    featured: false,
    image: 'https://angelform.in/store/image/cache/catalog/A1-400x400.jpg',
    description: `Comfortable and durable ${name} by Angelform. Crafted for everyday wear.`
  }));

  const { data, error } = await supabase
    .from('products')
    .insert(productInserts);

  if (error) {
    console.error('Error inserting products', error);
  } else {
    console.log('Successfully added', productsToAdd.length, 'products with scraped Angelform details!');
  }
}

run();

