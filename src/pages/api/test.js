

export default async function handler(res, req) { 


  req.setHeader('Allow-Access-Control-Origin', '*');
  res.status(200)
  .json({
    message: 'yo'
  })
}