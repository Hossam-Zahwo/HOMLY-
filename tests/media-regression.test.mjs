import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareHomeyImage, uploadHomeyImages } from '../src/lib/cloudinary-media.ts';

test('small product image remains byte-for-byte unchanged', async () => {
  const file = new File([new Uint8Array(200)], 'product.png', { type: 'image/png' });
  assert.equal(await prepareHomeyImage(file), file);
});

test('unsupported formats are rejected before upload', async () => {
  const file = new File(['image'], 'bad.svg', { type: 'image/svg+xml' });
  await assert.rejects(() => prepareHomeyImage(file), /غير مدعومة/);
});

test('image resize produces high-quality WebP and keeps full originals recoverable', async () => {
  const originalBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  const original = new File([new Uint8Array(600_000)], 'product.jpg', { type: 'image/jpeg' });
  let closed = false;
  let canvas;
  const qualities = [];
  try {
    globalThis.createImageBitmap = async () => ({
      width: 2100, height: 1400, close: () => { closed = true; }
    });
    globalThis.document = {
      createElement(tag) {
        assert.equal(tag, 'canvas');
        canvas = {
          width: 0, height: 0,
          getContext: () => ({ drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: 'low' }),
          toBlob(callback, format, quality) {
            assert.equal(format, 'image/webp');
            qualities.push(quality);
            callback(new Blob([new Uint8Array(400_000)], { type: 'image/webp' }));
          }
        };
        return canvas;
      }
    };
    const compressed = await prepareHomeyImage(original);
    assert.equal(compressed.type, 'image/webp');
    assert.equal(compressed.name, 'product.webp');
    assert.equal(compressed.size, 400_000);
    assert.deepEqual(qualities, [0.88]);
    assert.ok(closed);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
    assert.equal(original.size, 600_000, 'original input must remain unchanged');
  } finally {
    if (originalBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalBitmap;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('failed individual files never masquerade as successful uploads', async () => {
  const invalid = new File(['no'], 'bad.svg', { type: 'image/svg+xml' });
  let progress = 0;
  const results = await uploadHomeyImages([invalid], async () => { throw Error('signer must not run'); },
    done => { progress = done; });
  assert.equal(results.length, 1);
  assert.equal(progress, 1);
  assert.match(results[0].error, /غير مدعومة/);
  assert.equal(results[0].image, undefined);
});

test('product page calls all React hooks before any early return', () => {
  const source = readFileSync(new URL('../src/routes/product.$slug.tsx', import.meta.url), 'utf8');
  const page = source.slice(source.indexOf('function ProductPage()'));
  const firstReturn = page.indexOf('if (error) return');
  assert.ok(firstReturn > 0);
  for (const hook of ['useCopy()', 'Route.useParams()', 'useCatalog()', 'useFavorites()', 'useState(0)', 'useCart()', 'useNavigate()']) {
    const position = page.indexOf(hook);
    assert.ok(position >= 0 && position < firstReturn, hook + ' must run before conditional rendering');
  }
});

test('Cloudinary CDN image sizing uses automatic modern format with original fallback', () => {
  const transform = readFileSync(new URL('../src/lib/image-optimization.ts', import.meta.url), 'utf8');
  const picture = readFileSync(new URL('../src/components/StoreUI.tsx', import.meta.url), 'utf8');
  assert.match(transform, /f_auto,q_/);
  assert.match(transform, /c_limit/);
  assert.match(transform, /return isCloudinaryImage\(url\)/);
  assert.match(picture, /if \(responsive && !useOriginal\) \{ setUseOriginal\(true\)/);
});
