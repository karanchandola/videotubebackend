import multer from "multer";


const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb){
        cb(null, Date.now() + "-" + file.originalname) // to avoid file name conflicts, later add a unique identifier like UUID
    }
})


export const upload = multer({
    storage,
})