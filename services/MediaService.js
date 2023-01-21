import { Model, DataTypes } from "sequelize";
import db from "../config/database/Database.js"
import { v4 as uuid4 } from 'uuid'
import path from 'path'
import fse from 'fs-extra'
import mediaConfig from "../config/MediaConfig.js";
// Helper function
// const uppercaseFirst = str => `${str[0].toUpperCase()}${str.substr(1)}`;


class Media extends Model {

    // getMediatable(options) {
    //     if (!this.mediatable_type) return Promise.resolve(null);
    //     const mixinMethodName = `get${uppercaseFirst(this.mediatable_type)}`;
    //     return this[mixinMethodName](options);
    // }

}

Media.init({
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    info: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    local_storage: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    mediatable_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    mediatable_type: {
        type: DataTypes.STRING,
        allowNull: false
    }
},
    {
        sequelize: db, // We need to pass the connection instance
        tableName: "Medias",
        modelName: 'Media', // We need to choose the model name
        timestamps: true
    })

Media.addHook("afterDestroy", async (media) => {
    try {
        await fse.remove(media.url)
    } catch (error) {
    }
})

Media.loadSync = async function ({ alter = false }) {
    // handling for multiple index of url
    try {
        await db.query(`ALTER TABLE Medias DROP INDEX url`).then(() => {
        })
    } catch (error) {
        console.log("error")
    }
    await Media.sync({
        alter: alter,
    })
}

// ------------------------------------------------------------------------------------------- binding with any model
const hasMedia = async (model = Model) => {

    model.hasMany(Media, {
        as: 'media',
        foreignKey: 'mediatable_id',
        constraints: false,
        scope: {
            mediatable_type: model
        }
    })
    Media.belongsTo(model, { foreignKey: 'mediatable_id', constraints: false });

    model.prototype.saveMedia = async function (file, name) {
        saveMedia({
            model: this,
            file: file,
            name: name
        })
    }


    model.addHook("afterDestroy", (_model) => {
        Media.destroy({
            where: {
                mediatable_id: _model.where.id,
                mediatable_type: _model.constructor.name
            }
        })
    })

    model.addHook("afterFind", async function (_model) {
        console.log("_model.constructor.name", _model.constructor.name)
        const media = await Media.findAll({
            where: {
                mediatable_id: _model.id,
                mediatable_type: _model.constructor.name
            }
        });
        let newMedia = []
        for (let m of media) {
            if (m.local_storage) {
                m.url = normalizeLocalStorageToUrl(m.url)
            }
            newMedia.push(m)
        }
        _model.media = newMedia;
        _model.dataValues.media = newMedia;

        _model.firstMedia = newMedia.length > 0 ? newMedia[0] : null
        _model.firstMediaUrl = newMedia.length > 0 ? newMedia[0].url : null
    })
}

// ------------------------------------------------------------------------------------------- get media function

// const getMedia = async ({ model = Model, single = false }) => {

//     const mediatable_id = model.id
//     const mediatable_type = model.constructor.options.name.singular

//     console.log(mediatable_id)
//     console.log(mediatable_type)

//     var media
//     if (single) {
//         media = await Media.findOne({
//             where: {
//                 mediatable_id: mediatable_id,
//                 mediatable_type: mediatable_type,
//             },
//         })
//     }
//     else {
//         media = await Media.findAll({
//             where: {
//                 mediatable_id: mediatable_id,
//                 mediatable_type: mediatable_type,
//             },
//         })
//     }
//     return media
// }


// ------------------------------------------------------------------------------------------- store file functions
const saveToLocal = async (file, mediatable_type, mediatable_id) => {
    return await new Promise(async (resolve, reject) => {
        const folderName = mediaConfig.localStorage + "/" + mediatable_type + "-" + mediatable_id
        const fileName = uuid4() + file.info.fileExtension
        const targetDir = path.join(folderName, fileName);
        // create folder if not exist
        if (!fse.existsSync(folderName)) {
            await fse.mkdirSync(folderName, { recursive: true });
        }

        await fse.move(file.tempDir, targetDir, (err) => {
            if (err) {
                console.log("error when rename file to permanent storage")
                console.log(err);
                reject(err);
            }
            resolve(targetDir)
        })
    })
}

const saveMedia = async ({ model = Model, file = Object, name = String }) => {
    if (!file || !name) {
        console.log("need file & name")
        return
    }
    const mediatable_id = model.id
    const mediatable_type = model.constructor.options.name.singular

    const media = await Media.findOne({
        where: {
            mediatable_id: mediatable_id,
            mediatable_type: mediatable_type,
            name: name
        }
    })

    var targetDir
    if (mediaConfig.usingLocalStorage) {
        targetDir = await saveToLocal(file, mediatable_type, mediatable_id)
    }
    if (targetDir) {
        if (!media) {
            await Media.create({
                mediatable_id: mediatable_id,
                mediatable_type: mediatable_type,
                url: targetDir,
                info: JSON.stringify(file.info),
                name: name,
                local_storage: mediaConfig.usingLocalStorage
            })
        }
        else {
            try {
                await fse.remove(media.url)
            } catch (error) {
            }
            await media.update({
                url: targetDir,
                info: JSON.stringify(file.info),
                local_storage: mediaConfig.usingLocalStorage
            })

        }
    }

    return targetDir
}
// -------------------------------------------------------------------------------------------  helpers
const normalizeLocalStorageToUrl = (filePath) => {
    let directories = filePath.split(path.sep);
    directories = directories.slice(1);
    let newPath = directories.join(path.sep);
    console.log("newPath", newPath)
    return mediaConfig.root_media_url + newPath
}
// ------------------------------------------------------------------------------------------- 

export default Media
export { hasMedia, saveMedia }
