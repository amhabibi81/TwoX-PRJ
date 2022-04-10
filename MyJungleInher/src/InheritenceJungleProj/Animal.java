package InheritenceJungleProj;

public abstract class Animal {
    private String name;
    private int age;

    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName_of_animal() {
        return name;
    }

    void show(){
        System.out.print("name: "+name+", age: "+age);
    }
}
