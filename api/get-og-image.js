require('dotenv').config();
import chromium from 'chrome-aws-lambda';
import playwright from 'playwright-core';
import cloudinary from 'cloudinary'
import fs from 'fs'

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
// - Blog gets returned image

// allowed origins
const allowedOrigins = [
    'https://www.richardhaines.dev/',
    `https://www.richardhaines.dev/writing/`,
    'https://richardhaines.dev/',
    `https://richardhaines.dev/writing/`,
    'https://richardhaines-og-image.vercel.app/',
    'http://localhost:3000/'
]
// Initializing the cors middleware
// const cors = Cors({
//     origin: (origin, callback) => {
//         if (allowedOrigins.includes(origin)) {
//             callback(null, true)
//         } else {
//             callback(new Error())
//         }
//     },
// })

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
// const runCorsMiddleware = (req, res) => {
//     return new Promise((resolve, reject) => {
//         cors(req, res, (result) => {
//             if (result instanceof Error) {
//                 return reject(result)
//             }
//             return resolve(result)
//         })
//     })
// }

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

const BASE_URL = 'https://richardhaines-og-image.vercel.app'

async function handler(req, res) {
    // params posted to function
    const { title, description, slug } = req.body;

    // res.setHeader('Access-Control-Allow-Origin', '*');
    let image;

    try {
        // check if the image already exists in our cloudinary folder
        cloudinary.v2.search
            .expression(`resource_type:image AND folder=og_images`)
            .execute()
            .then
            ((result) => {
                if (result && result.total_count >= 1) {
                    image = result
                    // res.status(200)
                    //     .json({
                    //         image: result,
                    //         message: `Image already exists in cloudinary folder`,
                    //     });
                }
            }).catch((e) => {
                res.status(404)
                    .json({
                        image: '',
                        message: `Error on cloudinary search: ${e.message}`,
                    })
            })

        // launch chromium browser
        const browser = await playwright.chromium.launch({
            args: chromium.args,
            // args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            // executablePath: await chrome.executablePath || "C:\\Users\\richa\\AppData\\Local\\ms-playwright\\chromium-907428\\chrome-win\\chrome.exe",
            // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            executablePath: await chromium.executablePath,
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

        // const bufferToBase64 = (blob) => {
        //     const reader = new FileReader();
        //     reader.readAsDataURL(blob);
        //     return new Promise((resolve) => {
        //         reader.onloadend = () => {
        //             resolve(reader.result);
        //         };
        //     });
        // };

        // take the screenshot
        const buffer = await page.screenshot({ encoding: "base64" })

        // convert buffer to base64 string
        const imageToSend = buffer.toString('base64')

        try {

            await cloudinary.v2.uploader.upload(buffer, { public_id: `ogImages/${slug}` }, (error, result) => {
                if (error) {
                    // res.status(500)
                    res.json({
                        message: `Error in cloudinary upload: ${error}`,
                    })
                } else if (result) {
                    console.log({ result });
                    image = result
                    // res.status(200)
                    res.json({
                        image: result,
                        message: `Image ready for use`,
                    });
                }
            });
            // console.log({ uploadResponse });
            // image = uploadResponse
            // // res.status(200)
            // res.json({
            //     image: uploadResponse,
            //     message: `Image ready for use`,
            // });
        } catch (error) {
            // res.status(500)
            res.json({
                message: `Error in cloudinary upload catch: ${error}`,
            })
        }
        //upload image to cloudinary
        // cloudinary.v2.uploader.upload(imageToSend, { public_id: `ogImages/${slug}` }).then((result) => {
        //     console.log({ result })
        //     console.log('upload error: ', error)
        //     image = result
        //     res.status(200)
        //         .json({
        //             image: result,
        //             message: `Image ready for use`,
        //         });
        // }).catch((e) => {
        //     res.status(500)
        //         .json({
        //             image: '',
        //             message: `Error in cloudinary upload: ${e.message}`,
        //         })
        // })

        // await page.close()
        await browser.close()

        // if (image) {
        //     res.status(200)
        //         .json({
        //             image: result,
        //             message: `Image ready for use`,
        //         });
        // }


    } catch (e) {
        res.status(500)
            .json({
                message: `Error in serverless function: ${e.message}`,
            })
    }


    // } catch (error) {
    //     res.status(403).json({ message: '🚫 Request blocked by CORS' })
    // }


}

export default allowCors(handler)