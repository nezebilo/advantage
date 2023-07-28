# https://docs.djangoproject.com/en/4.1/ref/django-admin/#django.core.management.call_command
# https://stackoverflow.com/questions/1601153/django-custom-command-and-cron
# https://medium.com/@bencleary/django-schedule-tasks-664649be2dea

from django.core import management

class Command(management.BaseCommand):
    
    def handle(self, *args, **kwargs):
        
        def update_school(limit=1000):
            """Update school info in Place, then in ZoneDetail table
            Take limit as the maximum number of requests to send to NYC database
            Default is 1000, which is 10-30% greater than the average number of schools in NYC"""
            management.call_command('update_hospital',limit) 
        # management.call_command('calculate_business')

        def update_hospital(limit=100):
            """Update hospital info in Place, then in ZoneDetail table
            Take limit as the maximum number of requests to send to NYC database
            Default is 100, which is 10-30% greater than the average number of hospitals in NYC"""
            management.call_command('update_school',limit) 

        def update_wifi(limit=4000):
            """Update wifi hotspots info in Place, then in ZoneDetail table
            Take limit as the maximum number of requests to send to NYC database
            Default is 4000, which is 10-30% greater than the average number of wifi hotspots in NYC"""
            management.call_command('update_wifi',limit)

        update_school()
        update_hospital()
        update_wifi()
        management.call_command('calculate_hospital_school_wifi')
        