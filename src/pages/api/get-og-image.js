require('dotenv').config();
// import chrome from 'chrome-aws-lambda';
import { chromium } from 'playwright';
import cloudinary from 'cloudinary'

const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    // another common pattern
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    return await fn(req, res)
}

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// - Og-image app is a single route that has an 1200x630 dimension og card. It takes its data from the query params.
// - Call serverless function in og-image app. Passing:
//     - Title
//     - Description
//     - Slug
// - Serverless function passes title and description as query params to the go-image apps url
// - Take screenshot with playwrite
// - Upload screenshot to cloudinary with slug as images name
// - Blog fetches correct go image based on slug match

const BASE_URL = 'https://richardhaines-og-image.vercel.app'

async function handler(res, req) {
    // params posted to function
    const { body: { title, description, slug } } = req;

    try {

        // check if the image already exists in our cloudinary folder
        cloudinary.v2.search
            .expression(`resource_type:image AND folder=og_images`)
            .execute()
            .then
            ((result) => {
                if (result && result.total_count >= 1) {
                    res.json({
                        status: 200,
                        imageCreated: false,
                        imageExists: true,
                        meessage: `Image already exists in cloudinary folder`,
                    });
                } else {
                    // launch chromium browser
                    const browser = await chromium.launch({
                        // args: chrome.args,
                        args: ["--no-sandbox", "--disable-setuid-sandbox"],
                        // executablePath: await chrome.executablePath || "C:\\Users\\richa\\AppData\\Local\\ms-playwright\\chromium-907428\\chrome-win\\chrome.exe",
                        // executablePath: await chrome.executablePath || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                        headless: true,
                    });

                    // the og-images url with query params
                    const url = `${BASE_URL}/?title=${title}&description=${description}`;
                    // create a new page with the correct dimensions
                    const page = await browser.newPage({
                        viewport: {
                            width: 1200,
                            height: 630
                        }
                    });
                    //go to the og-images url. With the query params added,
                    // it should produce our blog posts og-image with the posts title and description
                    await page.goto(url, {
                        timeout: 15 * 1000
                    })
                    // take the screenshot
                    const screenshot = (await page.screenshot({ type: 'png' })).toString()

                    //upload image to cloudinary
                    cloudinary.v2.uploader.upload(screenshot, {
                        public_id: `og_images/${slug}`,
                    }, (error, result) => {
                        // if the upload was good, return 200 and success message
                        res.json({
                            staus: 200,
                            imageCreated: true,
                            imageExists: true,
                            meessage: `Image successfully uploaded to cloudinary`,
                        });
                        // if the upload was bad, return 500 and error message
                        if (error) {
                            res.json({
                                status: 500,
                                imageCreated: false,
                                imageExists: false,
                                message: `Error uploading image to cloudinary: ${error.message}`,
                            })
                        }
                    })
                }
            }).catch((error) => {
                res.json({
                    status: 500,
                    imageCreated: false,
                    imageExists: false,
                    message: `Error : ${e.message}`,
                })
            })


    } catch (e) {
        res.json({
            status: 500,
            imageCreated: false,
            imageExists: false,
            message: `Error in serverless function: ${e.message}`,
        })
    }
}

export default allowCors(handler)