/*
Getter/Setter.
*/
class Circle {
    constructor(radius) {
        this.radius= radius;
    }

    set radius(radius) {
        if (radius > 0) {
            this._radius = radius;
        } else {
            // must throw Exception but not implementd yet
            console.log('Illegal radius!');
        }
    }

    get radius() {
        return this._radius;
    }

    get area() {
        return 3.14 * this.radius * this.radius;
    } 
}

const c = new Circle(5);
console.log(c.area);

c.radius = 10;
console.log(c.area);

c.radius = -10;
