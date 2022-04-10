package InheritenceJungleProj;

public class Main {
    public static void main(String[] args) {
        Animal animal1=new Cheetah("Cheetah",15,120,"The fastest");
        Animal animal2=new Eagle("Eagle",7,85,"Very Careful");
        Animal animal3=new Parrot("Parrot",3,20,"The most beautiful");
        Animal animal4=new Girafe("Giraffe",10,69,"The tallest");
        Hunter hunter1=new Cheetah("Cheetah",15,120,"The fastest");
        Hunter hunter2=new Eagle("Eagle",7,85,"Very Careful");
        Prey prey1=new Girafe("Giraffe",10,69,"The tallest");
        Prey prey2=new Parrot("Parrot",3,20,"The most beautiful");

        animal1.show();
        animal2.show();
        animal3.show();
        animal4.show();
        (hunter1).hunt(prey1);
        (hunter2).hunt(prey2);
    }
}
