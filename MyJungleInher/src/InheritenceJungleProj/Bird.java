package InheritenceJungleProj;

public abstract class Bird extends Animal {
    private int height_of_fly;

    public Bird(String name, int age, int height_of_fly) {
        super(name, age);
        this.height_of_fly = height_of_fly;
    }

    @Override
    void show() {
        super.show();
        System.out.print(", height of fly: "+height_of_fly);
    }
}
