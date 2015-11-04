var gulp = require("gulp");
var sass = require("gulp-sass");
var sourcemaps = require("gulp-sourcemaps");
var bs = require("browser-sync").create();

gulp.task("default", ["browsersync", "sass:watch", "watch:files"]);

gulp.task("sass", function () {
    gulp.src("./css/**/*.scss")
        .pipe(sourcemaps.init())
        .pipe(sass().on("error", sass.logError))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("./css"))
        .pipe(bs.stream());
});

gulp.task("sass:watch", function () {
    gulp.watch("./css/**/*.scss", ["sass"]);
});

gulp.task("watch:files", function () {
    gulp.watch(["index.html", "./dev/**/*.js"]).on("change", bs.reload)
});

gulp.task("browsersync", function () {
    bs.init({
        server: "./"
    });
});
