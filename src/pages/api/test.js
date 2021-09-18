

export default async function handler(req, res) { 
  const { title, description, slug } = req.body;

  console.log(title, description, slug);

  res.setHeader('Allow-Access-Control-Origin', '*');
  res.status(200)
  .json({
    message: 'yo'
  })
}


// export default async function handler(req, res) {
//   res.setHeader('Access-Control-Allow-Origin', '*')

//   res.status(200).json({
//     message: 'Bird shirts ok! ',
//   })
// }
